use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenAccount, TokenInterface};

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;
use crate::instructions::mint::validate_oracle_price;

pub fn burn_tokens_handler(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    require!(!stablecoin.paused, ViexError::Paused);

    // Role check
    let is_authority = ctx.accounts.burner.key() == stablecoin.authority;
    if !is_authority {
        let role = &ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active, ViexError::Unauthorized);
        require!(role.role == Role::Burner, ViexError::Unauthorized);
    }

    // Oracle check
    if let (Some(oracle_config), Some(price_feed)) = (
        &ctx.accounts.oracle_config,
        &ctx.accounts.price_feed,
    ) {
        if oracle_config.enabled {
            validate_oracle_price(
                &price_feed.to_account_info(),
                oracle_config.max_deviation_bps,
                oracle_config.max_staleness_secs,
            )?;
        }
    }

    // Burn
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_2022::Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.burner_token_account.to_account_info(),
                authority: ctx.accounts.burner.to_account_info(),
            },
        ),
        amount,
    )?;

    stablecoin.total_burned = stablecoin.total_burned
        .checked_add(amount)
        .ok_or(ViexError::MathOverflow)?;

    let clock = Clock::get()?;
    emit!(TokensBurned {
        mint: ctx.accounts.mint.key(),
        burner: ctx.accounts.burner.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub burner: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Burner.as_seed(), burner.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    #[account(mut)]
    pub burner_token_account: InterfaceAccount<'info, TokenAccount>,

    pub oracle_config: Option<Account<'info, OracleConfig>>,

    /// CHECK: Pyth price feed
    pub price_feed: Option<UncheckedAccount<'info>>,

    pub token_program: Interface<'info, TokenInterface>,
}
