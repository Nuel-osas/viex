use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenInterface};
use spl_token_2022::{
    extension::ExtensionType,
    state::Mint as SplMint,
    instruction as token_instruction,
};
use spl_token_metadata_interface::instruction as metadata_instruction;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn initialize_handler(
    ctx: Context<Initialize>,
    name: String,
    symbol: String,
    uri: String,
    decimals: u8,
    config: StablecoinInitConfig,
) -> Result<()> {
    require!(name.len() > 0 && name.len() <= MAX_NAME_LEN, ViexError::InvalidName);
    require!(symbol.len() > 0 && symbol.len() <= MAX_SYMBOL_LEN, ViexError::InvalidSymbol);
    require!(uri.len() <= MAX_URI_LEN, ViexError::InvalidUri);
    require!(decimals <= 18, ViexError::InvalidDecimals);

    let mint_key = ctx.accounts.mint.key();
    let stablecoin_seeds = &[
        STABLECOIN_SEED,
        mint_key.as_ref(),
        &[ctx.bumps.stablecoin],
    ];
    let signer_seeds = &[&stablecoin_seeds[..]];

    // Build extension list
    let mut extensions = vec![ExtensionType::MetadataPointer];
    if config.enable_permanent_delegate {
        extensions.push(ExtensionType::PermanentDelegate);
    }
    if config.enable_transfer_hook {
        extensions.push(ExtensionType::TransferHook);
    }
    if config.enable_default_account_state {
        extensions.push(ExtensionType::DefaultAccountState);
    }
    if config.enable_confidential_transfer {
        extensions.push(ExtensionType::ConfidentialTransferMint);
    }

    // Calculate space
    let metadata_space = 4 + name.len() + 4 + symbol.len() + 4 + uri.len() + 300;
    let mint_space = ExtensionType::try_calculate_account_len::<SplMint>(&extensions)
        .map_err(|_| ViexError::MathOverflow)?;
    let total_space = mint_space + metadata_space;
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(total_space);

    // Create mint account
    anchor_lang::system_program::create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.authority.to_account_info(),
                to: ctx.accounts.mint.to_account_info(),
            },
        ),
        lamports,
        mint_space as u64,
        &token_2022::ID,
    )?;

    // Initialize extensions
    let mint_info = ctx.accounts.mint.to_account_info();
    let stablecoin_key = ctx.accounts.stablecoin.key();

    // MetadataPointer
    anchor_lang::solana_program::program::invoke(
        &spl_token_2022::extension::metadata_pointer::instruction::initialize(
            &token_2022::ID,
            &mint_key,
            Some(stablecoin_key),
            Some(mint_key),
        )?,
        &[mint_info.clone()],
    )?;

    // PermanentDelegate
    if config.enable_permanent_delegate {
        anchor_lang::solana_program::program::invoke(
            &spl_token_2022::instruction::initialize_permanent_delegate(
                &token_2022::ID,
                &mint_key,
                &stablecoin_key,
            )?,
            &[mint_info.clone()],
        )?;
    }

    // TransferHook
    if config.enable_transfer_hook {
        if let Some(hook_program) = &ctx.accounts.transfer_hook_program {
            anchor_lang::solana_program::program::invoke(
                &spl_token_2022::extension::transfer_hook::instruction::initialize(
                    &token_2022::ID,
                    &mint_key,
                    Some(stablecoin_key),
                    Some(hook_program.key()),
                )?,
                &[mint_info.clone()],
            )?;
        }
    }

    // DefaultAccountState (frozen)
    if config.enable_default_account_state {
        anchor_lang::solana_program::program::invoke(
            &spl_token_2022::extension::default_account_state::instruction::initialize_default_account_state(
                &token_2022::ID,
                &mint_key,
                &spl_token_2022::state::AccountState::Frozen,
            )?,
            &[mint_info.clone()],
        )?;
    }

    // ConfidentialTransferMint
    if config.enable_confidential_transfer {
        let ix = spl_token_2022::extension::confidential_transfer::instruction::initialize_mint(
            &token_2022::ID,
            &mint_key,
            Some(stablecoin_key),
            true,
            None,
        )?;
        anchor_lang::solana_program::program::invoke(&ix, &[mint_info.clone()])?;
    }

    // Initialize mint
    anchor_lang::solana_program::program::invoke(
        &token_instruction::initialize_mint2(
            &token_2022::ID,
            &mint_key,
            &stablecoin_key,
            Some(&stablecoin_key),
            decimals,
        )?,
        &[mint_info.clone()],
    )?;

    // Initialize metadata
    anchor_lang::solana_program::program::invoke_signed(
        &metadata_instruction::initialize(
            &token_2022::ID,
            &mint_key,
            &stablecoin_key,
            &mint_key,
            &stablecoin_key,
            name.clone(),
            symbol.clone(),
            uri.clone(),
        ),
        &[
            mint_info.clone(),
            ctx.accounts.stablecoin.to_account_info(),
        ],
        signer_seeds,
    )?;

    // Set stablecoin state
    let stablecoin = &mut ctx.accounts.stablecoin;
    let clock = Clock::get()?;
    let treasury_key = ctx.accounts.treasury.key();

    stablecoin.authority = ctx.accounts.authority.key();
    stablecoin.mint = mint_key;
    stablecoin.treasury = treasury_key;
    stablecoin.name = name.clone();
    stablecoin.symbol = symbol.clone();
    stablecoin.uri = uri;
    stablecoin.decimals = decimals;
    stablecoin.paused = false;
    stablecoin.enable_permanent_delegate = config.enable_permanent_delegate;
    stablecoin.enable_transfer_hook = config.enable_transfer_hook;
    stablecoin.enable_allowlist = config.enable_allowlist;
    stablecoin.total_minted = 0;
    stablecoin.total_burned = 0;
    stablecoin.supply_cap = 0;
    stablecoin.pending_authority = None;
    stablecoin.bump = ctx.bumps.stablecoin;
    stablecoin._reserved = [0u8; 23];

    emit!(StablecoinInitialized {
        mint: mint_key,
        authority: ctx.accounts.authority.key(),
        treasury: treasury_key,
        name,
        symbol,
        decimals,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Treasury account — validated by has_one
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    /// CHECK: Mint to be initialized — created in handler
    pub mint: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Stablecoin::MAX_SIZE,
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    /// CHECK: Optional transfer hook program
    pub transfer_hook_program: Option<UncheckedAccount<'info>>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}
