use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint as MintAccount;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn pause_handler(ctx: Context<PauseUnpause>) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Pauser, ViexError::Unauthorized);
    }

    stablecoin.paused = true;

    let clock = Clock::get()?;
    emit!(Paused {
        mint: ctx.accounts.mint.key(),
        paused_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn unpause_handler(ctx: Context<PauseUnpause>) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Pauser, ViexError::Unauthorized);
    }

    stablecoin.paused = false;

    let clock = Clock::get()?;
    emit!(Unpaused {
        mint: ctx.accounts.mint.key(),
        unpaused_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct PauseUnpause<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Pauser.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,
}
