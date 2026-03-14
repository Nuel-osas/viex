use anchor_lang::prelude::*;
use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

/// Initialize a new multi-currency treasury
pub fn init_treasury_handler(
    ctx: Context<InitTreasury>,
    name: String,
    base_currency: String,
    travel_rule_threshold: u64,
    kyc_required: bool,
) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, ViexError::InvalidName);
    require!(base_currency.len() <= MAX_SYMBOL_LEN, ViexError::InvalidSymbol);

    let treasury = &mut ctx.accounts.treasury;
    let clock = Clock::get()?;

    treasury.authority = ctx.accounts.authority.key();
    treasury.name = name.clone();
    treasury.mints = Vec::new();
    treasury.base_currency = base_currency.clone();
    treasury.travel_rule_threshold = if travel_rule_threshold == 0 {
        TRAVEL_RULE_THRESHOLD_DEFAULT
    } else {
        travel_rule_threshold
    };
    treasury.kyc_required = kyc_required;
    treasury.created_at = clock.unix_timestamp;
    treasury.bump = ctx.bumps.treasury;
    treasury._reserved = [0u8; 32];

    emit!(TreasuryCreated {
        treasury: treasury.key(),
        authority: ctx.accounts.authority.key(),
        name,
        base_currency,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Register an existing stablecoin mint into the treasury
pub fn register_mint_handler(
    ctx: Context<RegisterMint>,
) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    let stablecoin = &ctx.accounts.stablecoin;

    require!(
        treasury.authority == ctx.accounts.authority.key(),
        ViexError::Unauthorized
    );
    require!(
        treasury.mints.len() < MAX_TREASURY_MINTS,
        ViexError::TreasuryFull
    );
    require!(
        !treasury.mints.contains(&stablecoin.mint),
        ViexError::MintAlreadyRegistered
    );

    treasury.mints.push(stablecoin.mint);

    let clock = Clock::get()?;
    emit!(MintRegistered {
        treasury: treasury.key(),
        mint: stablecoin.mint,
        symbol: stablecoin.symbol.clone(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Treasury::MAX_SIZE,
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump,
    )]
    pub treasury: Account<'info, Treasury>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterMint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [TREASURY_SEED, authority.key().as_ref()],
        bump = treasury.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub treasury: Account<'info, Treasury>,

    pub stablecoin: Account<'info, Stablecoin>,
}
