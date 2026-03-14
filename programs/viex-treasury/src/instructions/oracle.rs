use anchor_lang::prelude::*;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

/// Configure oracle price feed for a stablecoin (for peg enforcement on mint/burn)
pub fn configure_oracle_handler(
    ctx: Context<ConfigureOracle>,
    price_feed: Pubkey,
    max_deviation_bps: u16,
    max_staleness_secs: u64,
    enabled: bool,
) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let oracle = &mut ctx.accounts.oracle_config;
    oracle.stablecoin = stablecoin.key();
    oracle.price_feed = price_feed;
    oracle.max_deviation_bps = max_deviation_bps;
    oracle.max_staleness_secs = max_staleness_secs;
    oracle.enabled = enabled;
    oracle.bump = ctx.bumps.oracle_config;

    let clock = Clock::get()?;
    emit!(OracleConfigured {
        mint: stablecoin.mint,
        price_feed,
        max_deviation_bps,
        max_staleness_secs,
        enabled,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Configure an FX pair oracle for cross-currency conversion
pub fn configure_fx_pair_handler(
    ctx: Context<ConfigureFxPair>,
    price_feed: Pubkey,
    max_staleness_secs: u64,
    max_slippage_bps: u16,
    enabled: bool,
) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);

    let fx_pair = &mut ctx.accounts.fx_pair_config;
    fx_pair.treasury = treasury.key();
    fx_pair.source_mint = ctx.accounts.source_mint.key();
    fx_pair.dest_mint = ctx.accounts.dest_mint.key();
    fx_pair.price_feed = price_feed;
    fx_pair.max_staleness_secs = max_staleness_secs;
    fx_pair.max_slippage_bps = max_slippage_bps;
    fx_pair.enabled = enabled;
    fx_pair.bump = ctx.bumps.fx_pair_config;

    let clock = Clock::get()?;
    emit!(FxPairConfigured {
        treasury: treasury.key(),
        source_mint: ctx.accounts.source_mint.key(),
        dest_mint: ctx.accounts.dest_mint.key(),
        price_feed,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Remove (close) an FX pair config and reclaim rent to authority.
/// Only treasury authority can close.
pub fn remove_fx_pair_handler(ctx: Context<RemoveFxPair>) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);

    let fx_pair = &ctx.accounts.fx_pair_config;

    let clock = Clock::get()?;
    emit!(FxPairRemoved {
        treasury: treasury.key(),
        source_mint: fx_pair.source_mint,
        dest_mint: fx_pair.dest_mint,
        closed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Account is closed via the `close = authority` constraint
    Ok(())
}

#[derive(Accounts)]
pub struct ConfigureOracle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        init_if_needed,
        payer = authority,
        space = OracleConfig::MAX_SIZE,
        seeds = [ORACLE_CONFIG_SEED, stablecoin.key().as_ref()],
        bump,
    )]
    pub oracle_config: Account<'info, OracleConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfigureFxPair<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump = treasury.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    /// CHECK: Source stablecoin mint
    pub source_mint: UncheckedAccount<'info>,

    /// CHECK: Destination stablecoin mint
    pub dest_mint: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = FxPairConfig::MAX_SIZE,
        seeds = [FX_PAIR_SEED, treasury.key().as_ref(), source_mint.key().as_ref(), dest_mint.key().as_ref()],
        bump,
    )]
    pub fx_pair_config: Account<'info, FxPairConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFxPair<'info> {
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
        has_one = treasury,
        close = authority,
    )]
    pub fx_pair_config: Account<'info, FxPairConfig>,
}
