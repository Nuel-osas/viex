use anchor_lang::prelude::*;

// ── Core Events (inherited from SSS) ──

#[event]
pub struct StablecoinInitialized {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub timestamp: i64,
}

#[event]
pub struct TokensMinted {
    pub mint: Pubkey,
    pub minter: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensBurned {
    pub mint: Pubkey,
    pub burner: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct AccountFrozen {
    pub mint: Pubkey,
    pub account: Pubkey,
    pub frozen_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AccountThawed {
    pub mint: Pubkey,
    pub account: Pubkey,
    pub thawed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct Paused {
    pub mint: Pubkey,
    pub paused_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct Unpaused {
    pub mint: Pubkey,
    pub unpaused_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleAssigned {
    pub mint: Pubkey,
    pub role: String,
    pub assignee: Pubkey,
    pub assigned_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleRevoked {
    pub mint: Pubkey,
    pub role: String,
    pub assignee: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityNominated {
    pub mint: Pubkey,
    pub new_authority: Pubkey,
    pub nominated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityTransferred {
    pub mint: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SupplyCapUpdated {
    pub mint: Pubkey,
    pub new_cap: u64,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BlacklistAdded {
    pub mint: Pubkey,
    pub address: Pubkey,
    pub reason: String,
    pub added_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct BlacklistRemoved {
    pub mint: Pubkey,
    pub address: Pubkey,
    pub removed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AllowlistAdded {
    pub mint: Pubkey,
    pub address: Pubkey,
    pub added_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AllowlistRemoved {
    pub mint: Pubkey,
    pub address: Pubkey,
    pub removed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TokensSeized {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub seized_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MetadataUpdated {
    pub mint: Pubkey,
    pub uri: String,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct OracleConfigured {
    pub mint: Pubkey,
    pub price_feed: Pubkey,
    pub max_deviation_bps: u16,
    pub max_staleness_secs: u64,
    pub enabled: bool,
    pub timestamp: i64,
}

// ── Treasury Events (new) ──

#[event]
pub struct TreasuryCreated {
    pub treasury: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub base_currency: String,
    pub timestamp: i64,
}

#[event]
pub struct MintRegistered {
    pub treasury: Pubkey,
    pub mint: Pubkey,
    pub symbol: String,
    pub timestamp: i64,
}

// ── FX Events (new) ──

#[event]
pub struct CurrencyConverted {
    pub treasury: Pubkey,
    pub source_mint: Pubkey,
    pub dest_mint: Pubkey,
    pub source_amount: u64,
    pub dest_amount: u64,
    pub fx_rate: i64,         // Pyth price (scaled)
    pub fx_expo: i32,         // Pyth exponent
    pub converted_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FxPairConfigured {
    pub treasury: Pubkey,
    pub source_mint: Pubkey,
    pub dest_mint: Pubkey,
    pub price_feed: Pubkey,
    pub timestamp: i64,
}

// ── KYC Events (new) ──

#[event]
pub struct KycApproved {
    pub treasury: Pubkey,
    pub address: Pubkey,
    pub kyc_level: u8,
    pub jurisdiction: [u8; 3],
    pub provider: String,
    pub expires_at: i64,
    pub approved_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct KycRevoked {
    pub treasury: Pubkey,
    pub address: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}

// ── Travel Rule Events (new) ──

#[event]
pub struct TravelRuleAttached {
    pub treasury: Pubkey,
    pub transfer_signature: [u8; 64],
    pub source_mint: Pubkey,
    pub amount: u64,
    pub originator_name: String,
    pub originator_vasp: String,
    pub beneficiary_name: String,
    pub beneficiary_vasp: String,
    pub created_by: Pubkey,
    pub timestamp: i64,
}

// ── Close / Rent Reclamation Events ──

#[event]
pub struct BlacklistEntryClosed {
    pub mint: Pubkey,
    pub address: Pubkey,
    pub closed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct KycEntryClosed {
    pub treasury: Pubkey,
    pub address: Pubkey,
    pub closed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct TravelRuleClosed {
    pub treasury: Pubkey,
    pub transfer_signature: [u8; 64],
    pub closed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FxPairRemoved {
    pub treasury: Pubkey,
    pub source_mint: Pubkey,
    pub dest_mint: Pubkey,
    pub closed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RoleClosed {
    pub mint: Pubkey,
    pub role: String,
    pub assignee: Pubkey,
    pub closed_by: Pubkey,
    pub timestamp: i64,
}
