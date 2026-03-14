use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenAccount, TokenInterface};

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

/// Convert between two treasury stablecoins using Pyth FX oracle rate.
/// Burns source stablecoin, mints destination stablecoin at the oracle rate.
pub fn convert_handler(
    ctx: Context<Convert>,
    source_amount: u64,
    min_dest_amount: u64, // slippage protection
) -> Result<()> {
    let source_stablecoin = &ctx.accounts.source_stablecoin;
    let dest_stablecoin = &ctx.accounts.dest_stablecoin;
    let fx_pair = &ctx.accounts.fx_pair_config;

    // Validate
    require!(!source_stablecoin.paused, ViexError::Paused);
    require!(!dest_stablecoin.paused, ViexError::Paused);
    require!(fx_pair.enabled, ViexError::InvalidFxRate);
    require!(
        source_stablecoin.mint != dest_stablecoin.mint,
        ViexError::SameCurrencyConversion
    );

    // Read FX rate from Pyth
    let (fx_rate, fx_expo) = read_pyth_price(&ctx.accounts.price_feed.to_account_info(), fx_pair.max_staleness_secs)?;

    // Calculate destination amount:
    // dest_amount = source_amount * fx_rate / 10^(-fx_expo)
    // Adjust for decimal differences between mints
    let source_decimals = ctx.accounts.source_mint.decimals as i32;
    let dest_decimals = ctx.accounts.dest_mint.decimals as i32;

    let dest_amount = calculate_conversion(
        source_amount,
        fx_rate,
        fx_expo,
        source_decimals,
        dest_decimals,
    )?;

    // Slippage check
    require!(dest_amount >= min_dest_amount, ViexError::FxSlippageExceeded);

    // Check dest supply cap
    if dest_stablecoin.supply_cap > 0 {
        let current_supply = dest_stablecoin.total_minted
            .checked_sub(dest_stablecoin.total_burned)
            .ok_or(ViexError::MathOverflow)?;
        require!(
            current_supply.checked_add(dest_amount).ok_or(ViexError::MathOverflow)? <= dest_stablecoin.supply_cap,
            ViexError::SupplyCapExceeded
        );
    }

    // 1. Burn source tokens from converter's account
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.source_token_program.to_account_info(),
            token_2022::Burn {
                mint: ctx.accounts.source_mint.to_account_info(),
                from: ctx.accounts.converter_source_account.to_account_info(),
                authority: ctx.accounts.converter.to_account_info(),
            },
        ),
        source_amount,
    )?;

    // Update source stablecoin tracking
    let source_stablecoin = &mut ctx.accounts.source_stablecoin;
    source_stablecoin.total_burned = source_stablecoin.total_burned
        .checked_add(source_amount)
        .ok_or(ViexError::MathOverflow)?;

    // 2. Mint dest tokens to converter's account via PDA
    let dest_mint_key = ctx.accounts.dest_mint.key();
    let dest_seeds = &[
        STABLECOIN_SEED,
        dest_mint_key.as_ref(),
        &[dest_stablecoin.bump],
    ];
    let signer_seeds = &[&dest_seeds[..]];

    token_2022::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.dest_token_program.to_account_info(),
            token_2022::MintTo {
                mint: ctx.accounts.dest_mint.to_account_info(),
                to: ctx.accounts.converter_dest_account.to_account_info(),
                authority: ctx.accounts.dest_stablecoin.to_account_info(),
            },
            signer_seeds,
        ),
        dest_amount,
    )?;

    // Update dest stablecoin tracking
    let dest_stablecoin = &mut ctx.accounts.dest_stablecoin;
    dest_stablecoin.total_minted = dest_stablecoin.total_minted
        .checked_add(dest_amount)
        .ok_or(ViexError::MathOverflow)?;

    let clock = Clock::get()?;
    emit!(CurrencyConverted {
        treasury: ctx.accounts.treasury.key(),
        source_mint: ctx.accounts.source_mint.key(),
        dest_mint: ctx.accounts.dest_mint.key(),
        source_amount,
        dest_amount,
        fx_rate,
        fx_expo,
        converted_by: ctx.accounts.converter.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Read price from Pyth v2 account (raw parsing)
fn read_pyth_price(price_feed_info: &AccountInfo, max_staleness: u64) -> Result<(i64, i32)> {
    let data = price_feed_info.try_borrow_data()?;
    require!(data.len() >= 240, ViexError::InvalidFxRate);

    let magic = u32::from_le_bytes(data[0..4].try_into().unwrap());
    require!(magic == PYTH_MAGIC, ViexError::InvalidFxRate);

    let expo = i32::from_le_bytes(data[208..212].try_into().unwrap());
    let price = i64::from_le_bytes(data[216..224].try_into().unwrap());
    let status = u32::from_le_bytes(data[232..236].try_into().unwrap());
    let publish_time = i64::from_le_bytes(data[40..48].try_into().unwrap());

    require!(status == 1, ViexError::InvalidFxRate); // Trading
    require!(price > 0, ViexError::InvalidFxRate);

    let clock = Clock::get()?;
    let age = clock.unix_timestamp.saturating_sub(publish_time) as u64;
    require!(age <= max_staleness, ViexError::FxRateStale);

    Ok((price, expo))
}

/// Calculate conversion amount with proper decimal handling.
/// FX rate is price of source in terms of dest (e.g., EUR/USD = 1.08 means 1 EUR = 1.08 USD)
fn calculate_conversion(
    source_amount: u64,
    fx_rate: i64,
    fx_expo: i32,
    source_decimals: i32,
    dest_decimals: i32,
) -> Result<u64> {
    // dest_amount = source_amount * fx_rate * 10^(dest_decimals - source_decimals + fx_expo)
    let amount_i128 = source_amount as i128;
    let rate_i128 = fx_rate as i128;

    let numerator = amount_i128
        .checked_mul(rate_i128)
        .ok_or(ViexError::MathOverflow)?;

    let exp_diff = dest_decimals - source_decimals + fx_expo;

    let result = if exp_diff >= 0 {
        numerator
            .checked_mul(10i128.pow(exp_diff as u32))
            .ok_or(ViexError::MathOverflow)?
    } else {
        numerator
            .checked_div(10i128.pow((-exp_diff) as u32))
            .ok_or(ViexError::MathOverflow)?
    };

    require!(result > 0 && result <= u64::MAX as i128, ViexError::MathOverflow);

    Ok(result as u64)
}

#[derive(Accounts)]
pub struct Convert<'info> {
    #[account(mut)]
    pub converter: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, treasury.authority.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Box<Account<'info, Treasury>>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, source_mint.key().as_ref()],
        bump = source_stablecoin.bump,
    )]
    pub source_stablecoin: Box<Account<'info, Stablecoin>>,

    #[account(
        mut,
        seeds = [STABLECOIN_SEED, dest_mint.key().as_ref()],
        bump = dest_stablecoin.bump,
    )]
    pub dest_stablecoin: Box<Account<'info, Stablecoin>>,

    #[account(mut)]
    pub source_mint: InterfaceAccount<'info, MintAccount>,

    #[account(mut)]
    pub dest_mint: InterfaceAccount<'info, MintAccount>,

    #[account(mut)]
    pub converter_source_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub converter_dest_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [FX_PAIR_SEED, treasury.key().as_ref(), source_mint.key().as_ref(), dest_mint.key().as_ref()],
        bump = fx_pair_config.bump,
    )]
    pub fx_pair_config: Account<'info, FxPairConfig>,

    /// CHECK: Pyth price feed for the FX pair
    pub price_feed: UncheckedAccount<'info>,

    pub source_token_program: Interface<'info, TokenInterface>,
    pub dest_token_program: Interface<'info, TokenInterface>,
}
