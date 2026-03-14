use anchor_lang::prelude::*;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn add_to_allowlist_handler(ctx: Context<AllowlistAdd>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_allowlist, ViexError::AllowlistNotEnabled);
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let entry = &mut ctx.accounts.allowlist_entry;
    let clock = Clock::get()?;

    entry.stablecoin = stablecoin.key();
    entry.address = ctx.accounts.target.key();
    entry.added_at = clock.unix_timestamp;
    entry.added_by = ctx.accounts.authority.key();
    entry.bump = ctx.bumps.allowlist_entry;

    emit!(AllowlistAdded {
        mint: stablecoin.mint,
        address: ctx.accounts.target.key(),
        added_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn remove_from_allowlist_handler(ctx: Context<AllowlistRemove>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_allowlist, ViexError::AllowlistNotEnabled);
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let clock = Clock::get()?;
    emit!(AllowlistRemoved {
        mint: stablecoin.mint,
        address: ctx.accounts.allowlist_entry.address,
        removed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AllowlistAdd<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: Address to add
    pub target: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = AllowlistEntry::MAX_SIZE,
        seeds = [ALLOWLIST_SEED, stablecoin.key().as_ref(), target.key().as_ref()],
        bump,
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AllowlistRemove<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        close = authority,
        seeds = [ALLOWLIST_SEED, stablecoin.key().as_ref(), allowlist_entry.address.as_ref()],
        bump = allowlist_entry.bump,
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,
}
