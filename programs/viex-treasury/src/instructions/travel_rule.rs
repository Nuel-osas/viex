use anchor_lang::prelude::*;

use crate::state::*;
use crate::events::*;
use crate::error::ViexError;
use crate::constants::*;

/// Attach Travel Rule compliance data to a transfer.
/// Required for transfers above the treasury's travel_rule_threshold.
/// Client must pass `sig_hash` = SHA256(transfer_signature) as the PDA seed (max 32 bytes).
pub fn attach_travel_rule_handler(
    ctx: Context<AttachTravelRule>,
    transfer_signature: [u8; 64],
    _sig_hash: [u8; 32],
    amount: u64,
    originator_name: String,
    originator_vasp: String,
    beneficiary_name: String,
    beneficiary_vasp: String,
) -> Result<()> {
    let treasury = &ctx.accounts.treasury;

    // Validate field lengths
    require!(originator_name.len() > 0 && originator_name.len() <= MAX_ORIGINATOR_NAME_LEN, ViexError::OriginatorNameRequired);
    require!(beneficiary_name.len() > 0 && beneficiary_name.len() <= MAX_BENEFICIARY_NAME_LEN, ViexError::BeneficiaryNameRequired);
    require!(originator_vasp.len() > 0 && originator_vasp.len() <= MAX_VASP_ID_LEN, ViexError::VaspIdRequired);
    require!(beneficiary_vasp.len() > 0 && beneficiary_vasp.len() <= MAX_VASP_ID_LEN, ViexError::VaspIdRequired);

    // If amount exceeds threshold, travel rule is mandatory
    if amount >= treasury.travel_rule_threshold {
        // All fields are required — already validated above
    }

    let message = &mut ctx.accounts.travel_rule_message;
    let clock = Clock::get()?;

    message.treasury = treasury.key();
    message.transfer_signature = transfer_signature;
    message.source_mint = ctx.accounts.source_mint.key();
    message.amount = amount;
    message.originator_name = originator_name.clone();
    message.originator_vasp = originator_vasp.clone();
    message.originator_account = ctx.accounts.originator.key();
    message.beneficiary_name = beneficiary_name.clone();
    message.beneficiary_vasp = beneficiary_vasp.clone();
    message.beneficiary_account = ctx.accounts.beneficiary.key();
    message.created_at = clock.unix_timestamp;
    message.created_by = ctx.accounts.authority.key();
    message.bump = ctx.bumps.travel_rule_message;

    emit!(TravelRuleAttached {
        treasury: treasury.key(),
        transfer_signature,
        source_mint: ctx.accounts.source_mint.key(),
        amount,
        originator_name,
        originator_vasp,
        beneficiary_name,
        beneficiary_vasp,
        created_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Close a travel rule message and reclaim rent to authority.
/// Only treasury authority can close.
pub fn close_travel_rule_handler(ctx: Context<CloseTravelRule>) -> Result<()> {
    let treasury = &ctx.accounts.treasury;
    require!(ctx.accounts.authority.key() == treasury.authority, ViexError::Unauthorized);

    let message = &ctx.accounts.travel_rule_message;

    let clock = Clock::get()?;
    emit!(TravelRuleClosed {
        treasury: treasury.key(),
        transfer_signature: message.transfer_signature,
        closed_by: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    // Account is closed via the `close = authority` constraint
    Ok(())
}

#[derive(Accounts)]
#[instruction(transfer_signature: [u8; 64], sig_hash: [u8; 32])]
pub struct AttachTravelRule<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, treasury.authority.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    /// CHECK: Source mint reference
    pub source_mint: UncheckedAccount<'info>,

    /// CHECK: Originator wallet
    pub originator: UncheckedAccount<'info>,

    /// CHECK: Beneficiary wallet
    pub beneficiary: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        space = TravelRuleMessage::MAX_SIZE,
        seeds = [TRAVEL_RULE_SEED, treasury.key().as_ref(), sig_hash.as_ref()],
        bump,
    )]
    pub travel_rule_message: Account<'info, TravelRuleMessage>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseTravelRule<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TREASURY_SEED, treasury.authority.as_ref()],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        mut,
        has_one = treasury,
        close = authority,
    )]
    pub travel_rule_message: Account<'info, TravelRuleMessage>,
}
