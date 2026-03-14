use anchor_lang::prelude::*;
use anchor_spl::token_2022;
use anchor_spl::token_interface::{Mint as MintAccount, TokenInterface};
use spl_token_metadata_interface::instruction as metadata_instruction;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

pub fn update_metadata_handler(ctx: Context<UpdateMetadata>, uri: String) -> Result<()> {
    let stablecoin = &ctx.accounts.stablecoin;
    require!(ctx.accounts.authority.key() == stablecoin.authority, ViexError::Unauthorized);
    require!(uri.len() <= MAX_URI_LEN, ViexError::InvalidUri);

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[STABLECOIN_SEED, mint_key.as_ref(), &[stablecoin.bump]];
    let signer_seeds = &[&seeds[..]];

    // Update URI field only (name/symbol immutable)
    anchor_lang::solana_program::program::invoke_signed(
        &metadata_instruction::update_field(
            &token_2022::ID,
            &mint_key,
            &stablecoin.key(),
            spl_token_metadata_interface::state::Field::Uri,
            uri.clone(),
        ),
        &[
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.stablecoin.to_account_info(),
        ],
        signer_seeds,
    )?;

    let clock = Clock::get()?;
    emit!(MetadataUpdated {
        mint: mint_key,
        uri,
        updated_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateMetadata<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [STABLECOIN_SEED, mint.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority @ ViexError::Unauthorized,
    )]
    pub stablecoin: Account<'info, Stablecoin>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, MintAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}
