use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenAccount, TokenInterface};

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn add_to_blacklist_handler(
    ctx: Context<BlacklistAdd>,
    reason: String,
) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_permanent_delegate, ViexError::ComplianceNotEnabled);
    require!(reason.len() <= MAX_REASON_LEN, ViexError::ReasonTooLong);

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Blacklister, ViexError::Unauthorized);
    }

    let entry = &mut ctx.accounts.blacklist_entry;
    require!(!entry.active, ViexError::AlreadyBlacklisted);

    let clock = Clock::get()?;
    entry.stablecoin = stablecoin.key();
    entry.address = ctx.accounts.target.key();
    entry.reason = reason.clone();
    entry.active = true;
    entry.blacklisted_at = clock.unix_timestamp;
    entry.blacklisted_by = ctx.accounts.authority.key();
    entry.bump = ctx.bumps.blacklist_entry;

    emit!(BlacklistAdded {
        mint: stablecoin.mint,
        address: ctx.accounts.target.key(),
        reason,
        added_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn remove_from_blacklist_handler(ctx: Context<BlacklistRemove>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_permanent_delegate, ViexError::ComplianceNotEnabled);

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Blacklister, ViexError::Unauthorized);
    }

    let entry = &mut ctx.accounts.blacklist_entry;
    require!(entry.active, ViexError::NotBlacklisted);
    entry.active = false;

    let clock = Clock::get()?;
    emit!(BlacklistRemoved {
        mint: stablecoin.mint,
        address: entry.address,
        removed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn seize_handler<'a>(ctx: Context<'_, '_, 'a, 'a, Seize<'a>>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_permanent_delegate, ViexError::ComplianceNotEnabled);
    require!(!stablecoin.paused, ViexError::Paused);

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Seizer, ViexError::Unauthorized);
    }

    // Must be blacklisted
    require!(ctx.accounts.blacklist_entry.active, ViexError::NotBlacklisted);

    let source_account = &ctx.accounts.source_token_account;
    let amount = source_account.amount;

    if amount == 0 {
        return Ok(());
    }

    // Transfer via permanent delegate (PDA)
    let mint_key = ctx.accounts.mint.key();
    let seeds = &[STABLECOIN_SEED, mint_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];
    let decimals = ctx.accounts.mint.decimals;

    // Build TransferChecked instruction manually for transfer hook support
    let mut transfer_ix = spl_token_2022::instruction::transfer_checked(
        &ctx.accounts.token_program.key(),
        &source_account.key(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.treasury_token_account.key(),
        &ctx.accounts.stablecoin.key(),
        &[],
        amount,
        decimals,
    )?;

    // Add remaining accounts for transfer hook extra metas
    let mut account_infos = vec![
        ctx.accounts.source_token_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.treasury_token_account.to_account_info(),
        ctx.accounts.stablecoin.to_account_info(),
    ];

    for remaining in ctx.remaining_accounts {
        transfer_ix.accounts.push(AccountMeta {
            pubkey: remaining.key(),
            is_signer: remaining.is_signer,
            is_writable: remaining.is_writable,
        });
        account_infos.push(remaining.to_account_info());
    }

    anchor_lang::solana_program::program::invoke_signed(
        &transfer_ix,
        &account_infos,
        signer_seeds,
    )?;

    let clock = Clock::get()?;
    emit!(TokensSeized {
        mint: mint_key,
        from: source_account.key(),
        to: ctx.accounts.treasury_token_account.key(),
        amount,
        seized_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Close a deactivated blacklist entry and reclaim rent to authority.
/// Only blacklister role or master authority can close.
pub fn close_blacklist_entry_handler(ctx: Context<CloseBlacklistEntry>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(stablecoin.enable_permanent_delegate, ViexError::ComplianceNotEnabled);

    let is_authority = ctx.accounts.authority.key() == stablecoin.authority;
    if !is_authority {
        let role = ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active && role.role == Role::Blacklister, ViexError::Unauthorized);
    }

    let entry = &ctx.accounts.blacklist_entry;
    require!(!entry.active, ViexError::AccountStillActive);

    let clock = Clock::get()?;
    emit!(BlacklistEntryClosed {
        mint: stablecoin.mint,
        address: entry.address,
        closed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Account is closed via the `close = authority` constraint
    Ok(())
}

// ── Account Structs ──

#[derive(Accounts)]
pub struct BlacklistAdd<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: Address to blacklist
    pub target: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = BlacklistEntry::MAX_SIZE,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), target.key().as_ref()],
        bump,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Blacklister.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BlacklistRemove<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Blacklister.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,
}

#[derive(Accounts)]
pub struct Seize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, mint.key().as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(mut)]
    pub source_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,

    pub blacklist_entry: Account<'info, BlacklistEntry>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Seizer.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CloseBlacklistEntry<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        seeds = [BLACKLIST_SEED, stablecoin.key().as_ref(), blacklist_entry.address.as_ref()],
        bump = blacklist_entry.bump,
        close = authority,
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Blacklister.as_seed(), authority.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,
}
