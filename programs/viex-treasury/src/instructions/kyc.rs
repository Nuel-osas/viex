use anchor_lang::prelude::*;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

/// Approve KYC for an address (treasury authority only)
pub fn kyc_approve_handler(
    ctx: Context<KycApprove>,
    kyc_level: u8,
    jurisdiction: [u8; 3],
    provider: String,
    expires_at: i64,
) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);
    require!(kyc_level >= 1 && kyc_level <= 3, ViexError::InvalidKycLevel);
    require!(provider.len() <= MAX_PROVIDER_LEN, ViexError::TravelRuleDataTooLong);

    // Validate jurisdiction is ASCII uppercase
    for &b in &jurisdiction {
        require!(b >= b'A' && b <= b'Z', ViexError::InvalidJurisdiction);
    }

    let entry = &mut ctx.accounts.kyc_entry;
    let clock = Clock::get()?;

    entry.treasury = treasury.key();
    entry.address = ctx.accounts.target.key();
    entry.kyc_level = match kyc_level {
        1 => KycLevel::Basic,
        2 => KycLevel::Enhanced,
        3 => KycLevel::Institutional,
        _ => return Err(ViexError::InvalidKycLevel.into()),
    };
    entry.jurisdiction = jurisdiction;
    entry.provider = provider.clone();
    entry.approved_at = clock.unix_timestamp;
    entry.expires_at = expires_at;
    entry.approved_by = ctx.accounts.authority.key();
    entry.active = true;
    entry.bump = ctx.bumps.kyc_entry;
    entry._reserved = [0u8; 16];

    emit!(KycApproved {
        treasury: treasury.key(),
        address: ctx.accounts.target.key(),
        kyc_level,
        jurisdiction,
        provider,
        expires_at,
        approved_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke KYC for an address (treasury authority only)
pub fn kyc_revoke_handler(ctx: Context<KycRevoke>) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);

    let entry = &mut ctx.accounts.kyc_entry;
    entry.active = false;

    let clock = Clock::get()?;
    emit!(KycRevoked {
        treasury: treasury.key(),
        address: entry.address,
        revoked_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Validate that an address has valid KYC (used internally by other instructions)
pub fn validate_kyc(
    kyc_entry: &KycEntry,
    min_level: u8,
) -> Result<()> {
    require!(kyc_entry.active, ViexError::KycNotApproved);

    // Check expiry
    if kyc_entry.expires_at > 0 {
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < kyc_entry.expires_at, ViexError::KycExpired);
    }

    // Check level
    let level = match kyc_entry.kyc_level {
        KycLevel::Basic => 1u8,
        KycLevel::Enhanced => 2,
        KycLevel::Institutional => 3,
    };
    require!(level >= min_level, ViexError::KycLevelInsufficient);

    Ok(())
}

/// Close a revoked KYC entry and reclaim rent to authority.
/// Only treasury authority can close.
pub fn kyc_close_handler(ctx: Context<KycClose>) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);

    let entry = &ctx.accounts.kyc_entry;
    require!(!entry.active, ViexError::AccountStillActive);

    let clock = Clock::get()?;
    emit!(KycEntryClosed {
        treasury: treasury.key(),
        address: entry.address,
        closed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Account is closed via the `close = authority` constraint
    Ok(())
}

#[derive(Accounts)]
pub struct KycApprove<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump = treasury.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    /// CHECK: Address to KYC
    pub target: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = KycEntry::MAX_SIZE,
        seeds = [KYC_SEED, treasury.key().as_ref(), target.key().as_ref()],
        bump,
    )]
    pub kyc_entry: Account<'info, KycEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct KycRevoke<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump = treasury.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [KYC_SEED, treasury.key().as_ref(), kyc_entry.address.as_ref()],
        bump = kyc_entry.bump,
    )]
    pub kyc_entry: Account<'info, KycEntry>,
}

#[derive(Accounts)]
pub struct KycClose<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump = treasury.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        seeds = [KYC_SEED, treasury.key().as_ref(), kyc_entry.address.as_ref()],
        bump = kyc_entry.bump,
        close = authority,
    )]
    pub kyc_entry: Account<'info, KycEntry>,
}
