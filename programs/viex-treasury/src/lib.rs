use anchor_lang::prelude::*;

pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

#[cfg(not(feature = "no-entrypoint"))]
solana_security_txt::security_txt! {
    name: "VIEX Treasury",
    project_url: "https://github.com/viex-treasury",
    contacts: "email:security@viex.dev",
    policy: "https://github.com/viex-treasury/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/viex-treasury"
}

declare_id!("3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU");

#[program]
pub mod viex_treasury {
    use super::*;

    // ── Treasury Management ──

    pub fn init_treasury(
        ctx: Context<InitTreasury>,
        name: String,
        base_currency: String,
        travel_rule_threshold: u64,
        kyc_required: bool,
    ) -> Result<()> {
        instructions::treasury::init_treasury_handler(ctx, name, base_currency, travel_rule_threshold, kyc_required)
    }

    pub fn register_mint(ctx: Context<RegisterMint>) -> Result<()> {
        instructions::treasury::register_mint_handler(ctx)
    }

    // ── Stablecoin Lifecycle ──

    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
        decimals: u8,
        config: StablecoinInitConfig,
    ) -> Result<()> {
        instructions::initialize::initialize_handler(ctx, name, symbol, uri, decimals, config)
    }

    pub fn mint_tokens(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        instructions::mint::mint_tokens_handler(ctx, amount)
    }

    pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        instructions::burn::burn_tokens_handler(ctx, amount)
    }

    pub fn freeze_account(ctx: Context<FreezeAccount>) -> Result<()> {
        instructions::freeze::freeze_handler(ctx)
    }

    pub fn thaw_account(ctx: Context<ThawAccount>) -> Result<()> {
        instructions::freeze::thaw_handler(ctx)
    }

    pub fn pause(ctx: Context<PauseUnpause>) -> Result<()> {
        instructions::pause::pause_handler(ctx)
    }

    pub fn unpause(ctx: Context<PauseUnpause>) -> Result<()> {
        instructions::pause::unpause_handler(ctx)
    }

    // ── Role Management ──

    pub fn assign_role(ctx: Context<AssignRole>, role: Role) -> Result<()> {
        instructions::roles::assign_role_handler(ctx, role)
    }

    pub fn revoke_role(ctx: Context<RevokeRole>) -> Result<()> {
        instructions::roles::revoke_role_handler(ctx)
    }

    pub fn nominate_authority(ctx: Context<NominateAuthority>, new_authority: Pubkey) -> Result<()> {
        instructions::roles::nominate_authority_handler(ctx, new_authority)
    }

    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        instructions::roles::accept_authority_handler(ctx)
    }

    pub fn transfer_authority(ctx: Context<TransferAuthority>, new_authority: Pubkey) -> Result<()> {
        instructions::roles::transfer_authority_handler(ctx, new_authority)
    }

    pub fn set_supply_cap(ctx: Context<SetSupplyCap>, supply_cap: u64) -> Result<()> {
        instructions::roles::set_supply_cap_handler(ctx, supply_cap)
    }

    pub fn update_minter_quota(ctx: Context<UpdateMinterQuota>, new_quota: u64) -> Result<()> {
        instructions::roles::update_minter_quota_handler(ctx, new_quota)
    }

    // ── Compliance (SSS-2) ──

    pub fn add_to_blacklist(ctx: Context<BlacklistAdd>, reason: String) -> Result<()> {
        instructions::compliance::add_to_blacklist_handler(ctx, reason)
    }

    pub fn remove_from_blacklist(ctx: Context<BlacklistRemove>) -> Result<()> {
        instructions::compliance::remove_from_blacklist_handler(ctx)
    }

    pub fn seize<'a>(ctx: Context<'_, '_, 'a, 'a, Seize<'a>>) -> Result<()> {
        instructions::compliance::seize_handler(ctx)
    }

    pub fn close_blacklist_entry(ctx: Context<CloseBlacklistEntry>) -> Result<()> {
        instructions::compliance::close_blacklist_entry_handler(ctx)
    }

    // ── Allowlist (SSS-3) ──

    pub fn add_to_allowlist(ctx: Context<AllowlistAdd>) -> Result<()> {
        instructions::allowlist::add_to_allowlist_handler(ctx)
    }

    pub fn remove_from_allowlist(ctx: Context<AllowlistRemove>) -> Result<()> {
        instructions::allowlist::remove_from_allowlist_handler(ctx)
    }

    // ── Metadata ──

    pub fn update_metadata(ctx: Context<UpdateMetadata>, uri: String) -> Result<()> {
        instructions::metadata::update_metadata_handler(ctx, uri)
    }

    // ── Oracle ──

    pub fn configure_oracle(
        ctx: Context<ConfigureOracle>,
        price_feed: Pubkey,
        max_deviation_bps: u16,
        max_staleness_secs: u64,
        enabled: bool,
    ) -> Result<()> {
        instructions::oracle::configure_oracle_handler(ctx, price_feed, max_deviation_bps, max_staleness_secs, enabled)
    }

    pub fn configure_fx_pair(
        ctx: Context<ConfigureFxPair>,
        price_feed: Pubkey,
        max_staleness_secs: u64,
        max_slippage_bps: u16,
        enabled: bool,
    ) -> Result<()> {
        instructions::oracle::configure_fx_pair_handler(ctx, price_feed, max_staleness_secs, max_slippage_bps, enabled)
    }

    // ── FX Conversion (new) ──

    pub fn convert(
        ctx: Context<Convert>,
        source_amount: u64,
        min_dest_amount: u64,
    ) -> Result<()> {
        instructions::convert::convert_handler(ctx, source_amount, min_dest_amount)
    }

    // ── KYC Registry (new) ──

    pub fn kyc_approve(
        ctx: Context<KycApprove>,
        kyc_level: u8,
        jurisdiction: [u8; 3],
        provider: String,
        expires_at: i64,
    ) -> Result<()> {
        instructions::kyc::kyc_approve_handler(ctx, kyc_level, jurisdiction, provider, expires_at)
    }

    pub fn kyc_revoke(ctx: Context<KycRevoke>) -> Result<()> {
        instructions::kyc::kyc_revoke_handler(ctx)
    }

    pub fn kyc_close(ctx: Context<KycClose>) -> Result<()> {
        instructions::kyc::kyc_close_handler(ctx)
    }

    // ── Travel Rule (new) ──

    pub fn attach_travel_rule(
        ctx: Context<AttachTravelRule>,
        transfer_signature: [u8; 64],
        sig_hash: [u8; 32],
        amount: u64,
        originator_name: String,
        originator_vasp: String,
        beneficiary_name: String,
        beneficiary_vasp: String,
    ) -> Result<()> {
        instructions::travel_rule::attach_travel_rule_handler(
            ctx, transfer_signature, sig_hash, amount,
            originator_name, originator_vasp,
            beneficiary_name, beneficiary_vasp,
        )
    }

    pub fn close_travel_rule(ctx: Context<CloseTravelRule>) -> Result<()> {
        instructions::travel_rule::close_travel_rule_handler(ctx)
    }

    // ── Rent Reclamation ──

    pub fn remove_fx_pair(ctx: Context<RemoveFxPair>) -> Result<()> {
        instructions::oracle::remove_fx_pair_handler(ctx)
    }

    pub fn close_role(ctx: Context<CloseRole>) -> Result<()> {
        instructions::roles::close_role_handler(ctx)
    }
}
