use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint as MintAccount;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn assign_role_handler(
    ctx: Context<AssignRole>,
    role: Role,
) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    // Compliance roles require compliance enabled
    if matches!(role, Role::Blacklister | Role::Seizer) {
        require!(stablecoin.enable_permanent_delegate, ViexError::ComplianceNotEnabled);
    }

    let role_assignment = &mut ctx.accounts.role_assignment;
    let clock = Clock::get()?;

    role_assignment.stablecoin = stablecoin.key();
    role_assignment.role = role;
    role_assignment.assignee = ctx.accounts.assignee.key();
    role_assignment.active = true;
    role_assignment.granted_by = ctx.accounts.authority.key();
    role_assignment.granted_at = clock.unix_timestamp;
    role_assignment.bump = ctx.bumps.role_assignment;

    emit!(RoleAssigned {
        mint: stablecoin.mint,
        role: format!("{:?}", role),
        assignee: ctx.accounts.assignee.key(),
        assigned_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Init MinterInfo if assigning minter
    if role == Role::Minter {
        if let Some(minter_info) = ctx.accounts.minter_info.as_mut() {
            minter_info.stablecoin = stablecoin.key();
            minter_info.minter = ctx.accounts.assignee.key();
            minter_info.quota = 0;
            minter_info.minted = 0;
            minter_info.bump = ctx.bumps.minter_info.unwrap_or(0);
        }
    }

    Ok(())
}

pub fn revoke_role_handler(ctx: Context<RevokeRole>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let role_assignment = &mut ctx.accounts.role_assignment;
    role_assignment.active = false;

    let clock = Clock::get()?;
    emit!(RoleRevoked {
        mint: stablecoin.mint,
        role: format!("{:?}", role_assignment.role),
        assignee: role_assignment.assignee,
        revoked_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn nominate_authority_handler(
    ctx: Context<NominateAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    stablecoin.pending_authority = Some(new_authority);

    let clock = Clock::get()?;
    emit!(AuthorityNominated {
        mint: stablecoin.mint,
        new_authority,
        nominated_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn accept_authority_handler(ctx: Context<AcceptAuthority>) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    let pending = stablecoin.pending_authority
        .ok_or(ViexError::NoPendingAuthority)?;
    require!(ctx.accounts.new_authority.key() == pending, ViexError::InvalidPendingAuthority);

    let old_authority = stablecoin.authority;
    stablecoin.authority = pending;
    stablecoin.pending_authority = None;

    let clock = Clock::get()?;
    emit!(AuthorityTransferred {
        mint: stablecoin.mint,
        old_authority,
        new_authority: pending,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn transfer_authority_handler(
    ctx: Context<TransferAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let old_authority = stablecoin.authority;
    stablecoin.authority = new_authority;
    stablecoin.pending_authority = None;

    let clock = Clock::get()?;
    emit!(AuthorityTransferred {
        mint: stablecoin.mint,
        old_authority,
        new_authority,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn set_supply_cap_handler(ctx: Context<SetSupplyCap>, supply_cap: u64) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    stablecoin.supply_cap = supply_cap;

    let clock = Clock::get()?;
    emit!(SupplyCapUpdated {
        mint: stablecoin.mint,
        new_cap: supply_cap,
        updated_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn update_minter_quota_handler(ctx: Context<UpdateMinterQuota>, new_quota: u64) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let minter_info = &mut ctx.accounts.minter_info;
    minter_info.quota = new_quota;

    Ok(())
}

/// Close a revoked role assignment and reclaim rent to authority.
/// Only master authority (stablecoin authority) can close.
pub fn close_role_handler(ctx: Context<CloseRole>) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);

    let role_assignment = &ctx.accounts.role_assignment;
    require!(!role_assignment.active, ViexError::AccountStillActive);

    let clock = Clock::get()?;
    emit!(RoleClosed {
        mint: stablecoin.mint,
        role: format!("{:?}", role_assignment.role),
        assignee: role_assignment.assignee,
        closed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Account is closed via the `close = authority` constraint
    Ok(())
}

// ── Account Structs ──

#[derive(Accounts)]
#[instruction(role: Role)]
pub struct AssignRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: The address receiving the role
    pub assignee: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = RoleAssignment::MAX_SIZE,
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), role.as_seed(), assignee.key().as_ref()],
        bump,
    )]
    pub role_assignment: Account<'info, RoleAssignment>,

    #[account(
        init_if_needed,
        payer = authority,
        space = MinterInfo::MAX_SIZE,
        seeds = [MINTER_INFO_SEED, stablecoin.key().as_ref(), assignee.key().as_ref()],
        bump,
    )]
    pub minter_info: Option<Account<'info, MinterInfo>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeRole<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub role_assignment: Account<'info, RoleAssignment>,
}

#[derive(Accounts)]
pub struct NominateAuthority<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    pub new_authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct SetSupplyCap<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,
}

#[derive(Accounts)]
pub struct UpdateMinterQuota<'info> {
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub minter_info: Account<'info, MinterInfo>,
}

#[derive(Accounts)]
pub struct CloseRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(seeds = [STABLECOIN_SEED, stablecoin.mint.as_ref()], bump = stablecoin.bump)]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(
        mut,
        has_one = stablecoin,
        close = authority,
    )]
    pub role_assignment: Account<'info, RoleAssignment>,
}
