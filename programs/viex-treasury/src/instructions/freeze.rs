use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenAccount, TokenInterface};

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn freeze_handler(ctx: Context<FreezeAccount>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Pauser, ViexError::Unauthorized);
    }

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[STABLECOIN_SEED, mint_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];

    token_2022::freeze_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_2022::FreezeAccount {
                account: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
    )?;

    let clock = Clock::get()?;
    emit!(AccountFrozen {
        mint: mint_key,
        account: ctx.accounts.token_account.key(),
        frozen_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn thaw_handler(ctx: Context<ThawAccount>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Pauser, ViexError::Unauthorized);
    }

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[STABLECOIN_SEED, mint_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];

    token_2022::thaw_account(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_2022::ThawAccount {
                account: ctx.accounts.token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
    )?;

    let clock = Clock::get()?;
    emit!(AccountThawed {
        mint: mint_key,
        account: ctx.accounts.token_account.key(),
        thawed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct FreezeAccount<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, mint.key().as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Pauser.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ThawAccount<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, mint.key().as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(mut)]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Pauser.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    pub token_program: Interface<'info, TokenInterface>,
}
