use anchor_lang::prelude::*;

use crate::constants::*;

// ── Treasury (new: coordinates multiple mints under one authority) ──

#[account]
pub struct Treasury {
    pub authority: Pubkey,
    pub name: String,
    pub mints: Vec<Pubkey>,           // registered stablecoin mints
    pub base_currency: String,        // e.g. "USD"
    pub travel_rule_threshold: u64,   // in base units (default: 3000 * 10^decimals)
    pub kyc_required: bool,
    pub created_at: i64,
    pub bump: u8,
    pub _reserved: [u8; 32],
}

impl Treasury {
    pub const MAX_SIZE: usize = 8  // discriminator
        + 32                        // authority
        + 4 + MAX_NAME_LEN          // name (string)
        + 4 + (32 * MAX_TREASURY_MINTS) // mints vec
        + 4 + MAX_SYMBOL_LEN        // base_currency
        + 8                          // travel_rule_threshold
        + 1                          // kyc_required
        + 8                          // created_at
        + 1                          // bump
        + 32;                        // reserved
}

// ── Stablecoin (forked from SSS, linked to treasury) ──

#[account]
pub struct Stablecoin {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub treasury: Pubkey,            // link back to parent treasury
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub paused: bool,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub enable_allowlist: bool,
    pub total_minted: u64,
    pub total_burned: u64,
    pub supply_cap: u64,
    pub pending_authority: Option<Pubkey>,
    pub bump: u8,
    pub _reserved: [u8; 23],
}

impl Stablecoin {
    pub const MAX_SIZE: usize = 8   // discriminator
        + 32                         // authority
        + 32                         // mint
        + 32                         // treasury
        + 4 + MAX_NAME_LEN           // name
        + 4 + MAX_SYMBOL_LEN         // symbol
        + 4 + MAX_URI_LEN            // uri
        + 1                          // decimals
        + 1                          // paused
        + 1                          // enable_permanent_delegate
        + 1                          // enable_transfer_hook
        + 1                          // enable_allowlist
        + 8                          // total_minted
        + 8                          // total_burned
        + 8                          // supply_cap
        + 1 + 32                     // pending_authority (Option<Pubkey>)
        + 1                          // bump
        + 23;                        // reserved
}

// ── Preset configs ──

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct StablecoinInitConfig {
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub enable_allowlist: bool,
    pub enable_default_account_state: bool,
    pub enable_confidential_transfer: bool,
}

impl StablecoinInitConfig {
    /// SSS-1: Minimal — metadata only
    pub fn sss1() -> Self {
        Self {
            enable_permanent_delegate: false,
            enable_transfer_hook: false,
            enable_allowlist: false,
            enable_default_account_state: false,
            enable_confidential_transfer: false,
        }
    }

    /// SSS-2: Compliant — permanent delegate + transfer hook + blacklist
    pub fn sss2() -> Self {
        Self {
            enable_permanent_delegate: true,
            enable_transfer_hook: true,
            enable_allowlist: false,
            enable_default_account_state: true,
            enable_confidential_transfer: false,
        }
    }

    /// SSS-3: Private — SSS-2 + allowlist + confidential transfer
    pub fn sss3() -> Self {
        Self {
            enable_permanent_delegate: true,
            enable_transfer_hook: true,
            enable_allowlist: true,
            enable_default_account_state: true,
            enable_confidential_transfer: true,
        }
    }
}

// ── Roles ──

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Minter,
    Burner,
    Blacklister,
    Pauser,
    Seizer,
}

impl Role {
    pub fn as_seed(&self) -> &[u8] {
        match self {
            Role::Minter => b"minter",
            Role::Burner => b"burner",
            Role::Blacklister => b"blacklister",
            Role::Pauser => b"pauser",
            Role::Seizer => b"seizer",
        }
    }
}

#[account]
pub struct RoleAssignment {
    pub stablecoin: Pubkey,
    pub role: Role,
    pub assignee: Pubkey,
    pub active: bool,
    pub granted_by: Pubkey,
    pub granted_at: i64,
    pub bump: u8,
}

impl RoleAssignment {
    pub const MAX_SIZE: usize = 8 + 32 + 1 + 32 + 1 + 32 + 8 + 1;
}

#[account]
pub struct MinterInfo {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub quota: u64,
    pub minted: u64,
    pub bump: u8,
}

impl MinterInfo {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

// ── Compliance ──

#[account]
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub reason: String,
    pub active: bool,
    pub blacklisted_at: i64,
    pub blacklisted_by: Pubkey,
    pub bump: u8,
}

impl BlacklistEntry {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 4 + MAX_REASON_LEN + 1 + 8 + 32 + 1;
}

#[account]
pub struct AllowlistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub added_at: i64,
    pub added_by: Pubkey,
    pub bump: u8,
}

impl AllowlistEntry {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 32 + 1;
}

// ── KYC Registry (new) ──

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum KycLevel {
    Basic,       // Level 1: name + ID verified
    Enhanced,    // Level 2: source of funds, PEP screening
    Institutional, // Level 3: full due diligence, board resolution
}

#[account]
pub struct KycEntry {
    pub treasury: Pubkey,
    pub address: Pubkey,
    pub kyc_level: KycLevel,
    pub jurisdiction: [u8; 3],      // ISO 3166-1 alpha-3 (e.g. "USA", "CHE", "BRA")
    pub provider: String,            // who verified (e.g. "Sumsub", "Jumio")
    pub approved_at: i64,
    pub expires_at: i64,             // 0 = never expires
    pub approved_by: Pubkey,
    pub active: bool,
    pub bump: u8,
    pub _reserved: [u8; 16],
}

impl KycEntry {
    pub const MAX_SIZE: usize = 8   // discriminator
        + 32                         // treasury
        + 32                         // address
        + 1                          // kyc_level
        + 3                          // jurisdiction
        + 4 + MAX_PROVIDER_LEN       // provider
        + 8                          // approved_at
        + 8                          // expires_at
        + 32                         // approved_by
        + 1                          // active
        + 1                          // bump
        + 16;                        // reserved
}

// ── Travel Rule (new) ──

#[account]
pub struct TravelRuleMessage {
    pub treasury: Pubkey,
    pub transfer_signature: [u8; 64], // tx signature of the transfer
    pub source_mint: Pubkey,
    pub amount: u64,
    pub originator_name: String,
    pub originator_vasp: String,      // VASP identifier
    pub originator_account: Pubkey,
    pub beneficiary_name: String,
    pub beneficiary_vasp: String,
    pub beneficiary_account: Pubkey,
    pub created_at: i64,
    pub created_by: Pubkey,
    pub bump: u8,
}

impl TravelRuleMessage {
    pub const MAX_SIZE: usize = 8    // discriminator
        + 32                          // treasury
        + 64                          // transfer_signature
        + 32                          // source_mint
        + 8                           // amount
        + 4 + MAX_ORIGINATOR_NAME_LEN // originator_name
        + 4 + MAX_VASP_ID_LEN         // originator_vasp
        + 32                           // originator_account
        + 4 + MAX_BENEFICIARY_NAME_LEN // beneficiary_name
        + 4 + MAX_VASP_ID_LEN          // beneficiary_vasp
        + 32                            // beneficiary_account
        + 8                             // created_at
        + 32                            // created_by
        + 1;                            // bump
}

// ── FX Pair Oracle Config (new) ──

#[account]
pub struct FxPairConfig {
    pub treasury: Pubkey,
    pub source_mint: Pubkey,
    pub dest_mint: Pubkey,
    pub price_feed: Pubkey,           // Pyth price feed for the FX pair
    pub max_staleness_secs: u64,
    pub max_slippage_bps: u16,        // max allowed slippage in basis points
    pub enabled: bool,
    pub bump: u8,
}

impl FxPairConfig {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 1 + 1;
}

// ── Oracle Config (per-stablecoin, forked from SSS) ──

#[account]
pub struct OracleConfig {
    pub stablecoin: Pubkey,
    pub price_feed: Pubkey,
    pub max_deviation_bps: u16,
    pub max_staleness_secs: u64,
    pub enabled: bool,
    pub bump: u8,
}

impl OracleConfig {
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 2 + 8 + 1 + 1;
}
