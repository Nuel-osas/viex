use anchor_lang::prelude::*;
use anchor_lang::system_program;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_token_2022::state::Account as TokenAccount;
use spl_token_2022::extension::StateWithExtensions;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY");

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "VIEX Transfer Hook — Cross-Border Stablecoin Treasury",
    project_url: "https://github.com/viex-treasury",
    contacts: "email:security@viex.dev",
    policy: "https://github.com/viex-treasury/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/viex-treasury",
    auditors: "None"
}

/// The viex-treasury program ID — blacklist/KYC PDAs are owned by this program.
const VIEX_TREASURY_PROGRAM_ID: Pubkey =
    pubkey!("3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU");

/// Seeds used by the viex-treasury program
const STABLECOIN_SEED: &[u8] = b"stablecoin";
const BLACKLIST_SEED: &[u8] = b"blacklist";
const KYC_SEED: &[u8] = b"kyc";
const TREASURY_SEED: &[u8] = b"treasury";

/// Read `enable_allowlist` flag from raw Stablecoin account data.
/// Layout: discriminator(8) + authority(32) + mint(32) + treasury(32) + 3 strings + bools
fn read_enable_allowlist(data: &[u8]) -> bool {
    let mut offset = 8 + 32 + 32 + 32; // 104
    for _ in 0..3 {
        if offset + 4 > data.len() { return false; }
        let len = u32::from_le_bytes(
            data[offset..offset + 4].try_into().unwrap_or([0; 4]),
        ) as usize;
        offset += 4 + len;
    }
    // Skip: decimals(1) + paused(1) + enable_permanent_delegate(1) + enable_transfer_hook(1)
    offset += 4;
    if offset >= data.len() { return false; }
    data[offset] != 0
}

/// Read the `treasury` pubkey from raw Stablecoin account data.
/// Layout: discriminator(8) + authority(32) + mint(32) + treasury(32)
fn read_treasury_key(data: &[u8]) -> Option<Pubkey> {
    if data.len() < 104 {
        return None;
    }
    let bytes: [u8; 32] = data[72..104].try_into().ok()?;
    Some(Pubkey::new_from_array(bytes))
}

/// Read `active` flag from BlacklistEntry.
/// Layout: discriminator(8) + stablecoin(32) + address(32) + reason_string + active(1)
fn read_blacklist_active(data: &[u8]) -> bool {
    let mut offset = 8 + 32 + 32;
    if offset + 4 > data.len() { return false; }
    let len = u32::from_le_bytes(
        data[offset..offset + 4].try_into().unwrap_or([0; 4]),
    ) as usize;
    offset += 4 + len;
    if offset >= data.len() { return false; }
    data[offset] != 0
}

/// Read `active` and `expires_at` from KycEntry.
/// Layout: discriminator(8) + treasury(32) + address(32) + kyc_level(1) + jurisdiction(3)
///       + provider_string + approved_at(8) + expires_at(8) + approved_by(32) + active(1)
fn read_kyc_valid(data: &[u8], now: i64) -> bool {
    let mut offset = 8 + 32 + 32; // 72: after discriminator + treasury + address
    // Skip kyc_level(1) + jurisdiction(3)
    offset += 4;
    // Skip provider string
    if offset + 4 > data.len() { return false; }
    let len = u32::from_le_bytes(
        data[offset..offset + 4].try_into().unwrap_or([0; 4]),
    ) as usize;
    offset += 4 + len;
    // Skip approved_at(8)
    offset += 8;
    // Read expires_at(8)
    if offset + 8 > data.len() { return false; }
    let expires_at = i64::from_le_bytes(
        data[offset..offset + 8].try_into().unwrap_or([0; 8]),
    );
    offset += 8;
    // Skip approved_by(32)
    offset += 32;
    // Read active(1)
    if offset >= data.len() { return false; }
    let active = data[offset] != 0;

    // Must be active AND not expired (0 = never expires)
    active && (expires_at == 0 || expires_at > now)
}

#[program]
pub mod viex_transfer_hook {
    use super::*;

    /// Called by Token-2022 on every transfer.
    /// Enforces blacklist (AML) and KYC checks.
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        let source_data = ctx.accounts.source_account.try_borrow_data()?;
        let source_account = StateWithExtensions::<TokenAccount>::unpack(&source_data)
            .map_err(|_| ProgramError::InvalidAccountData)?;
        let source_owner = source_account.base.owner;

        let dest_data = ctx.accounts.destination_account.try_borrow_data()?;
        let dest_account = StateWithExtensions::<TokenAccount>::unpack(&dest_data)
            .map_err(|_| ProgramError::InvalidAccountData)?;
        let dest_owner = dest_account.base.owner;
        let stablecoin_key = ctx.accounts.stablecoin.key();

        // Skip checks if authority is stablecoin PDA (permanent delegate seize)
        let is_delegate_seize = ctx.accounts.authority.key() == stablecoin_key;

        // ── Blacklist checks (AML) ──
        if !is_delegate_seize {
            let (source_blacklist_pda, _) = Pubkey::find_program_address(
                &[BLACKLIST_SEED, stablecoin_key.as_ref(), source_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );

            if let Some(source_bl) = &ctx.accounts.source_blacklist {
                if source_bl.key() == source_blacklist_pda
                    && source_bl.data_len() > 0
                    && source_bl.owner == &VIEX_TREASURY_PROGRAM_ID
                    && read_blacklist_active(&source_bl.try_borrow_data()?)
                {
                    return Err(error!(TransferHookError::SenderBlacklisted));
                }
            }

            let (dest_blacklist_pda, _) = Pubkey::find_program_address(
                &[BLACKLIST_SEED, stablecoin_key.as_ref(), dest_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );

            if let Some(dest_bl) = &ctx.accounts.destination_blacklist {
                if dest_bl.key() == dest_blacklist_pda
                    && dest_bl.data_len() > 0
                    && dest_bl.owner == &VIEX_TREASURY_PROGRAM_ID
                    && read_blacklist_active(&dest_bl.try_borrow_data()?)
                {
                    return Err(error!(TransferHookError::RecipientBlacklisted));
                }
            }
        }

        // ── KYC checks (when enable_allowlist is true) ──
        let stablecoin_data = ctx.accounts.stablecoin.try_borrow_data()?;
        let kyc_enabled = read_enable_allowlist(&stablecoin_data);
        let treasury_key = read_treasury_key(&stablecoin_data);
        drop(stablecoin_data);

        if kyc_enabled {
            if let Some(treasury) = treasury_key {
                // Derive treasury PDA to get the authority for KYC seed derivation
                // KYC PDAs are seeded by [b"kyc", treasury_pda, address]
                // We need the treasury PDA — derive it from the treasury authority
                // But we don't know the authority directly. Instead, the extra account metas
                // pass us the treasury account, from which we read the KYC PDAs.

                let clock = Clock::get()?;
                let now = clock.unix_timestamp;

                // Check source KYC
                let (source_kyc_pda, _) = Pubkey::find_program_address(
                    &[KYC_SEED, treasury.as_ref(), source_owner.as_ref()],
                    &VIEX_TREASURY_PROGRAM_ID,
                );

                let source_kyc_valid = ctx.accounts.source_kyc.as_ref()
                    .map(|kyc| {
                        kyc.key() == source_kyc_pda
                            && kyc.data_len() > 0
                            && kyc.owner == &VIEX_TREASURY_PROGRAM_ID
                            && kyc.try_borrow_data().map(|d| read_kyc_valid(&d, now)).unwrap_or(false)
                    })
                    .unwrap_or(false);

                if !source_kyc_valid {
                    return Err(error!(TransferHookError::SenderKycNotApproved));
                }

                // Check dest KYC
                let (dest_kyc_pda, _) = Pubkey::find_program_address(
                    &[KYC_SEED, treasury.as_ref(), dest_owner.as_ref()],
                    &VIEX_TREASURY_PROGRAM_ID,
                );

                let dest_kyc_valid = ctx.accounts.dest_kyc.as_ref()
                    .map(|kyc| {
                        kyc.key() == dest_kyc_pda
                            && kyc.data_len() > 0
                            && kyc.owner == &VIEX_TREASURY_PROGRAM_ID
                            && kyc.try_borrow_data().map(|d| read_kyc_valid(&d, now)).unwrap_or(false)
                    })
                    .unwrap_or(false);

                if !dest_kyc_valid {
                    return Err(error!(TransferHookError::RecipientKycNotApproved));
                }
            }
        }

        msg!("VIEX transfer hook: {} tokens approved", amount);
        Ok(())
    }

    /// Initialize extra account metas for blacklist + KYC PDA resolution.
    /// Layout:
    ///   0: source, 1: mint, 2: dest, 3: authority, 4: extraAccountMetaList
    ///   5: extra[0] = viex-treasury program ID
    ///   6: extra[1] = stablecoin PDA
    ///   7: extra[2] = source blacklist PDA
    ///   8: extra[3] = dest blacklist PDA
    ///   9: extra[4] = source KYC PDA (seeded by [kyc, treasury, source_owner])
    ///  10: extra[5] = dest KYC PDA (seeded by [kyc, treasury, dest_owner])
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        let extra_account_metas = &[
            // extra[0]: viex-treasury program ID
            ExtraAccountMeta::new_with_pubkey(&VIEX_TREASURY_PROGRAM_ID, false, false)
                .map_err(|_| ProgramError::InvalidArgument)?,
            // extra[1]: stablecoin config PDA (derived from mint)
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index = extra[0] = viex-treasury
                &[
                    Seed::Literal { bytes: STABLECOIN_SEED.to_vec() },
                    Seed::AccountKey { index: 1 }, // mint
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[2]: source blacklist PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: BLACKLIST_SEED.to_vec() },
                    Seed::AccountKey { index: 6 }, // stablecoin PDA (abs index 6 = extra[1])
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 }, // source owner
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[3]: dest blacklist PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: BLACKLIST_SEED.to_vec() },
                    Seed::AccountKey { index: 6 },
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 }, // dest owner
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[4]: source KYC PDA — seeded by [kyc, treasury_key_from_stablecoin, source_owner]
            // The treasury key is at bytes 72..104 in the stablecoin account (extra[1], abs index 6)
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: KYC_SEED.to_vec() },
                    Seed::AccountData { account_index: 6, data_index: 72, length: 32 }, // treasury from stablecoin
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 }, // source owner
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[5]: dest KYC PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: KYC_SEED.to_vec() },
                    Seed::AccountData { account_index: 6, data_index: 72, length: 32 }, // treasury from stablecoin
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 }, // dest owner
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
        ];

        let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())?;
        let lamports = Rent::get()?.minimum_balance(account_size);

        let mint_key = ctx.accounts.mint.key();
        let signer_seeds: &[&[u8]] = &[b"extra-account-metas", mint_key.as_ref()];
        let (_, bump) = Pubkey::find_program_address(signer_seeds, &crate::id());
        let signer_seeds_with_bump: &[&[u8]] =
            &[b"extra-account-metas", mint_key.as_ref(), &[bump]];

        let meta_account = &ctx.accounts.extra_account_meta_list;
        if meta_account.data_len() == 0 {
            system_program::create_account(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::CreateAccount {
                        from: ctx.accounts.payer.to_account_info(),
                        to: ctx.accounts.extra_account_meta_list.to_account_info(),
                    },
                    &[signer_seeds_with_bump],
                ),
                lamports,
                account_size as u64,
                &crate::id(),
            )?;

            ExtraAccountMetaList::init::<ExecuteInstruction>(
                &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
                extra_account_metas,
            )?;
        } else {
            ExtraAccountMetaList::update::<ExecuteInstruction>(
                &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
                extra_account_metas,
            )?;
        }

        msg!("VIEX extra account meta list initialized with blacklist + KYC PDAs");
        Ok(())
    }

    /// Fallback for spl-transfer-hook-interface Execute discriminator
    pub fn fallback<'info>(
        _program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        if data.len() < 16 {
            return Err(ProgramError::InvalidInstructionData.into());
        }
        let amount = u64::from_le_bytes(
            data[8..16].try_into().map_err(|_| ProgramError::InvalidInstructionData)?
        );

        // Account layout:
        //  0: source, 1: mint, 2: dest, 3: authority, 4: extraAccountMetaList
        //  5: extra[0] = viex-treasury program ID
        //  6: extra[1] = stablecoin PDA
        //  7: extra[2] = source blacklist PDA
        //  8: extra[3] = dest blacklist PDA
        //  9: extra[4] = source KYC PDA
        // 10: extra[5] = dest KYC PDA
        if accounts.len() < 7 {
            return Err(ProgramError::NotEnoughAccountKeys.into());
        }

        let source_account = &accounts[0];
        let dest_account = &accounts[2];
        let authority = &accounts[3];
        let stablecoin = &accounts[6];

        let source_data = source_account.try_borrow_data()?;
        let source_acct = StateWithExtensions::<TokenAccount>::unpack(&source_data)
            .map_err(|_| ProgramError::InvalidAccountData)?;
        let source_owner = source_acct.base.owner;
        drop(source_data);

        let dest_data = dest_account.try_borrow_data()?;
        let dest_acct = StateWithExtensions::<TokenAccount>::unpack(&dest_data)
            .map_err(|_| ProgramError::InvalidAccountData)?;
        let dest_owner = dest_acct.base.owner;
        drop(dest_data);

        let stablecoin_key = stablecoin.key();
        let is_delegate_seize = authority.key() == stablecoin_key;

        // Blacklist checks
        if !is_delegate_seize {
            let (source_bl_pda, _) = Pubkey::find_program_address(
                &[BLACKLIST_SEED, stablecoin_key.as_ref(), source_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );
            if accounts.len() > 7 {
                let source_bl = &accounts[7];
                if source_bl.key() == source_bl_pda
                    && source_bl.data_len() > 0
                    && source_bl.owner == &VIEX_TREASURY_PROGRAM_ID
                    && read_blacklist_active(&source_bl.try_borrow_data()?)
                {
                    return Err(error!(TransferHookError::SenderBlacklisted));
                }
            }

            let (dest_bl_pda, _) = Pubkey::find_program_address(
                &[BLACKLIST_SEED, stablecoin_key.as_ref(), dest_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );
            if accounts.len() > 8 {
                let dest_bl = &accounts[8];
                if dest_bl.key() == dest_bl_pda
                    && dest_bl.data_len() > 0
                    && dest_bl.owner == &VIEX_TREASURY_PROGRAM_ID
                    && read_blacklist_active(&dest_bl.try_borrow_data()?)
                {
                    return Err(error!(TransferHookError::RecipientBlacklisted));
                }
            }
        }

        // KYC checks
        let stablecoin_data = stablecoin.try_borrow_data()?;
        let kyc_enabled = read_enable_allowlist(&stablecoin_data);
        let treasury_key = read_treasury_key(&stablecoin_data);
        drop(stablecoin_data);

        if kyc_enabled {
            if let Some(treasury) = treasury_key {
                let clock = Clock::get()?;
                let now = clock.unix_timestamp;

                let (source_kyc_pda, _) = Pubkey::find_program_address(
                    &[KYC_SEED, treasury.as_ref(), source_owner.as_ref()],
                    &VIEX_TREASURY_PROGRAM_ID,
                );
                let source_valid = if accounts.len() > 9 {
                    let kyc = &accounts[9];
                    kyc.key() == source_kyc_pda
                        && kyc.data_len() > 0
                        && kyc.owner == &VIEX_TREASURY_PROGRAM_ID
                        && read_kyc_valid(&kyc.try_borrow_data()?, now)
                } else { false };
                if !source_valid {
                    return Err(error!(TransferHookError::SenderKycNotApproved));
                }

                let (dest_kyc_pda, _) = Pubkey::find_program_address(
                    &[KYC_SEED, treasury.as_ref(), dest_owner.as_ref()],
                    &VIEX_TREASURY_PROGRAM_ID,
                );
                let dest_valid = if accounts.len() > 10 {
                    let kyc = &accounts[10];
                    kyc.key() == dest_kyc_pda
                        && kyc.data_len() > 0
                        && kyc.owner == &VIEX_TREASURY_PROGRAM_ID
                        && read_kyc_valid(&kyc.try_borrow_data()?, now)
                } else { false };
                if !dest_valid {
                    return Err(error!(TransferHookError::RecipientKycNotApproved));
                }
            }
        }

        msg!("VIEX transfer hook (fallback): {} tokens approved", amount);
        Ok(())
    }
}

#[error_code]
pub enum TransferHookError {
    #[msg("Sender is blacklisted")]
    SenderBlacklisted,
    #[msg("Recipient is blacklisted")]
    RecipientBlacklisted,
    #[msg("Sender KYC not approved or expired")]
    SenderKycNotApproved,
    #[msg("Recipient KYC not approved or expired")]
    RecipientKycNotApproved,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    /// CHECK: Validated by Token-2022
    pub source_account: AccountInfo<'info>,
    /// CHECK: Validated by Token-2022
    pub mint: AccountInfo<'info>,
    /// CHECK: Validated by Token-2022
    pub destination_account: AccountInfo<'info>,
    /// CHECK: Validated by Token-2022
    pub authority: AccountInfo<'info>,
    /// CHECK: Stablecoin config PDA (reads enable_allowlist + treasury key)
    pub stablecoin: AccountInfo<'info>,
    /// CHECK: Source blacklist PDA
    pub source_blacklist: Option<AccountInfo<'info>>,
    /// CHECK: Dest blacklist PDA
    pub destination_blacklist: Option<AccountInfo<'info>>,
    /// CHECK: Source KYC PDA
    pub source_kyc: Option<AccountInfo<'info>>,
    /// CHECK: Dest KYC PDA
    pub dest_kyc: Option<AccountInfo<'info>>,
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Will be initialized as ExtraAccountMetaList
    #[account(mut)]
    pub extra_account_meta_list: AccountInfo<'info>,
    /// CHECK: The mint for this transfer hook
    pub mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
