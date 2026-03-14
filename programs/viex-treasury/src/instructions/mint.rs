use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenAccount, TokenInterface};

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn mint_tokens_handler(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let stablecoin = &mut ctx.accounts.stablecoin;

    // Checks
    require!(!stablecoin.paused, ViexError::Paused);

    // Role check: must be minter or authority
    let is_authority = ctx.accounts.minter.key() == stablecoin.authority;
    if !is_authority {
        let role = &ctx.accounts.role_assignment.as_ref()
            .ok_or(ViexError::Unauthorized)?;
        require!(role.active, ViexError::Unauthorized);
        require!(role.role == Role::Minter, ViexError::Unauthorized);
    }

    // Oracle check (if enabled)
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

    // Supply cap check
    if stablecoin.supply_cap > 0 {
        let new_total = stablecoin.total_minted
            .checked_sub(stablecoin.total_burned)
            .ok_or(ViexError::MathOverflow)?
            .checked_add(amount)
            .ok_or(ViexError::MathOverflow)?;
        require!(new_total <= stablecoin.supply_cap, ViexError::SupplyCapExceeded);
    }

    // Per-minter quota check
    if !is_authority {
        if let Some(minter_info) = ctx.accounts.minter_info.as_mut() {
            if minter_info.quota > 0 {
                let new_minted = minter_info.minted
                    .checked_add(amount)
                    .ok_or(ViexError::MathOverflow)?;
                require!(new_minted <= minter_info.quota, ViexError::MinterQuotaExceeded);
                minter_info.minted = new_minted;
            }
        }
    }

    // Mint tokens via PDA
    let mint_key = ctx.accounts.mint.key();
    let bump = stablecoin.bump;
    let seeds = &[
        STABLECOIN_SEED,
        mint_key.as_ref(),
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let stablecoin_info = stablecoin.to_account_info();
    token_2022::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token_2022::MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: stablecoin_info,
            },
            signer_seeds,
        ),
        amount,
    )?;

    stablecoin.total_minted = stablecoin.total_minted
        .checked_add(amount)
        .ok_or(ViexError::MathOverflow)?;

    let clock = Clock::get()?;
    emit!(TokensMinted {
        mint: mint_key,
        minter: ctx.accounts.minter.key(),
        recipient: ctx.accounts.recipient_token_account.key(),
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Validate Pyth oracle price (raw v2 parsing to avoid borsh conflicts)
pub fn validate_oracle_price(
    price_feed_info: &AccountInfo,
    max_deviation_bps: u16,
    max_staleness_secs: u64,
) -> Result<()> {
    let data = price_feed_info.try_borrow_data()?;
    require!(data.len() >= 240, ViexError::InvalidOracleAccount);

    // Check Pyth magic number
    let magic = u32::from_le_bytes(data[0..4].try_into().unwrap());
    require!(magic == crate::constants::PYTH_MAGIC, ViexError::InvalidOracleAccount);

    // Parse price fields
    let expo = i32::from_le_bytes(data[208..212].try_into().unwrap());
    let price = i64::from_le_bytes(data[216..224].try_into().unwrap());
    let status = u32::from_le_bytes(data[232..236].try_into().unwrap());
    let publish_time = i64::from_le_bytes(data[40..48].try_into().unwrap());

    // Must be trading
    require!(status == 1, ViexError::InvalidOracleAccount);

    // Check staleness
    let clock = Clock::get()?;
    let age = clock.unix_timestamp.saturating_sub(publish_time) as u64;
    require!(age <= max_staleness_secs, ViexError::OraclePriceStale);

    // Check deviation from $1.00 peg
    let one_dollar = 10i64.pow((-expo) as u32);
    let deviation = (price - one_dollar).abs();
    let deviation_bps = if one_dollar > 0 {
        ((deviation as i64) * 10000 / one_dollar) as u16
    } else {
        u16::MAX
    };
    require!(deviation_bps <= max_deviation_bps, ViexError::OraclePriceDepegged);

    Ok(())
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, MintAccount>,

    #[account(
        seeds = [ROLE_SEED, stablecoin.key().as_ref(), Role::Minter.as_seed(), minter.key().as_ref()],
        bump,
    )]
    pub role_assignment: Option<Account<'info, RoleAssignment>>,

    #[account(
        mut,
        seeds = [MINTER_INFO_SEED, stablecoin.key().as_ref(), minter.key().as_ref()],
        bump,
    )]
    pub minter_info: Option<Account<'info, MinterInfo>>,

    #[account(mut)]
    pub recipient_token_account: InterfaceAccount<'info, TokenAccount>,

    pub oracle_config: Option<Account<'info, OracleConfig>>,

    /// CHECK: Pyth price feed account
    pub price_feed: Option<UncheckedAccount<'info>>,

    pub token_program: Interface<'info, TokenInterface>,
}
