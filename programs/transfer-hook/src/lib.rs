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

/// The viex-treasury program ID — blacklist/allowlist PDAs are owned by this program.
const VIEX_TREASURY_PROGRAM_ID: Pubkey =
    pubkey!("3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU");

/// Seeds used by the viex-treasury program
const STABLECOIN_SEED: &[u8] = b"stablecoin";
const BLACKLIST_SEED: &[u8] = b"blacklist";
const ALLOWLIST_SEED: &[u8] = b"allowlist";

/// Read the `enable_allowlist` flag from raw Stablecoin account data.
/// Layout: discriminator(8) + authority(32) + mint(32) + treasury(32) + 3 strings + 5 bools
/// The treasury field is new vs SSS — offset adjusted accordingly.
fn read_enable_allowlist(data: &[u8]) -> bool {
    // discriminator(8) + authority(32) + mint(32) + treasury(32) = 104
    let mut offset = 8 + 32 + 32 + 32;
    // Skip 3 Borsh strings (name, symbol, uri): 4-byte length prefix + content each
    for _ in 0..3 {
        if offset + 4 > data.len() {
            return false;
        }
        let len = u32::from_le_bytes(
            data[offset..offset + 4].try_into().unwrap_or([0; 4]),
        ) as usize;
        offset += 4 + len;
    }
    // Skip: decimals(1) + paused(1) + enable_permanent_delegate(1) + enable_transfer_hook(1)
    offset += 4;
    if offset >= data.len() {
        return false;
    }
    // enable_allowlist is the next bool
    data[offset] != 0
}

/// Read the `active` flag from a BlacklistEntry account.
/// Layout: discriminator(8) + stablecoin(32) + address(32) + reason_string + active(1) + ...
fn read_blacklist_active(data: &[u8]) -> bool {
    let mut offset = 8 + 32 + 32; // discriminator + stablecoin + address
    if offset + 4 > data.len() {
        return false;
    }
    let len = u32::from_le_bytes(
        data[offset..offset + 4].try_into().unwrap_or([0; 4]),
    ) as usize;
    offset += 4 + len;
    // active field is right after reason string
    if offset >= data.len() {
        return false;
    }
    data[offset] != 0
}

#[program]
pub mod viex_transfer_hook {
    use super::*;

    /// Called by Token-2022 on every transfer.
    /// Enforces blacklist and allowlist (KYC gate) checks.
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

        // ── Blacklist checks ──
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

        // ── Allowlist / KYC gate checks ──
        let stablecoin_data = ctx.accounts.stablecoin.try_borrow_data()?;
        let allowlist_enabled = read_enable_allowlist(&stablecoin_data);
        drop(stablecoin_data);

        if allowlist_enabled {
            let (source_allowlist_pda, _) = Pubkey::find_program_address(
                &[ALLOWLIST_SEED, stablecoin_key.as_ref(), source_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );

            let source_allowed = ctx.accounts.source_allowlist.as_ref()
                .map(|al| {
                    al.key() == source_allowlist_pda
                        && al.data_len() > 0
                        && al.owner == &VIEX_TREASURY_PROGRAM_ID
                })
                .unwrap_or(false);

            if !source_allowed {
                return Err(error!(TransferHookError::SenderNotAllowlisted));
            }

            let (dest_allowlist_pda, _) = Pubkey::find_program_address(
                &[ALLOWLIST_SEED, stablecoin_key.as_ref(), dest_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );

            let dest_allowed = ctx.accounts.destination_allowlist.as_ref()
                .map(|al| {
                    al.key() == dest_allowlist_pda
                        && al.data_len() > 0
                        && al.owner == &VIEX_TREASURY_PROGRAM_ID
                })
                .unwrap_or(false);

            if !dest_allowed {
                return Err(error!(TransferHookError::RecipientNotAllowlisted));
            }
        }

        msg!("VIEX transfer hook: {} tokens approved", amount);
        Ok(())
    }

    /// Initialize extra account metas for blacklist + allowlist PDA resolution
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        let extra_account_metas = &[
            // extra[0]: viex-treasury program ID
            ExtraAccountMeta::new_with_pubkey(&VIEX_TREASURY_PROGRAM_ID, false, false)
                .map_err(|_| ProgramError::InvalidArgument)?,
            // extra[1]: stablecoin config PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
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
                    Seed::AccountKey { index: 6 },
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 },
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
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[4]: source allowlist PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: ALLOWLIST_SEED.to_vec() },
                    Seed::AccountKey { index: 6 },
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 },
                ],
                false,
                false,
            ).map_err(|_| ProgramError::InvalidArgument)?,
            // extra[5]: dest allowlist PDA
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: ALLOWLIST_SEED.to_vec() },
                    Seed::AccountKey { index: 6 },
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
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

        msg!("VIEX extra account meta list initialized");
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

        // Blacklist
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

        // Allowlist
        let stablecoin_data = stablecoin.try_borrow_data()?;
        let allowlist_enabled = read_enable_allowlist(&stablecoin_data);
        drop(stablecoin_data);

        if allowlist_enabled {
            let (source_al_pda, _) = Pubkey::find_program_address(
                &[ALLOWLIST_SEED, stablecoin_key.as_ref(), source_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );
            let source_allowed = if accounts.len() > 9 {
                let al = &accounts[9];
                al.key() == source_al_pda && al.data_len() > 0 && al.owner == &VIEX_TREASURY_PROGRAM_ID
            } else { false };
            if !source_allowed {
                return Err(error!(TransferHookError::SenderNotAllowlisted));
            }

            let (dest_al_pda, _) = Pubkey::find_program_address(
                &[ALLOWLIST_SEED, stablecoin_key.as_ref(), dest_owner.as_ref()],
                &VIEX_TREASURY_PROGRAM_ID,
            );
            let dest_allowed = if accounts.len() > 10 {
                let al = &accounts[10];
                al.key() == dest_al_pda && al.data_len() > 0 && al.owner == &VIEX_TREASURY_PROGRAM_ID
            } else { false };
            if !dest_allowed {
                return Err(error!(TransferHookError::RecipientNotAllowlisted));
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
    #[msg("Sender is not on the allowlist (KYC required)")]
    SenderNotAllowlisted,
    #[msg("Recipient is not on the allowlist (KYC required)")]
    RecipientNotAllowlisted,
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
    /// CHECK: Derived from mint
    pub stablecoin: AccountInfo<'info>,
    /// CHECK: PDA verification in handler
    pub source_blacklist: Option<AccountInfo<'info>>,
    /// CHECK: PDA verification in handler
    pub destination_blacklist: Option<AccountInfo<'info>>,
    /// CHECK: PDA verification in handler
    pub source_allowlist: Option<AccountInfo<'info>>,
    /// CHECK: PDA verification in handler
    pub destination_allowlist: Option<AccountInfo<'info>>,
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
