// PDA seeds
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const STABLECOIN_SEED: &[u8] = b"stablecoin";
pub const ROLE_SEED: &[u8] = b"role";
pub const BLACKLIST_SEED: &[u8] = b"blacklist";
pub const MINTER_INFO_SEED: &[u8] = b"minter_info";
pub const ALLOWLIST_SEED: &[u8] = b"allowlist";
pub const KYC_SEED: &[u8] = b"kyc";
pub const TRAVEL_RULE_SEED: &[u8] = b"travel_rule";
pub const ORACLE_CONFIG_SEED: &[u8] = b"oracle_config";
pub const FX_PAIR_SEED: &[u8] = b"fx_pair";

// Limits
pub const MAX_NAME_LEN: usize = 32;
pub const MAX_SYMBOL_LEN: usize = 10;
pub const MAX_URI_LEN: usize = 200;
pub const MAX_REASON_LEN: usize = 128;
pub const MAX_TREASURY_MINTS: usize = 10;
pub const MAX_VASP_ID_LEN: usize = 64;
pub const MAX_ORIGINATOR_NAME_LEN: usize = 64;
pub const MAX_BENEFICIARY_NAME_LEN: usize = 64;
pub const MAX_JURISDICTION_LEN: usize = 3;
pub const MAX_PROVIDER_LEN: usize = 32;

// Travel Rule threshold (in base units, 6 decimals = 3000 * 1_000_000)
pub const TRAVEL_RULE_THRESHOLD_DEFAULT: u64 = 3_000_000_000;

// KYC levels
pub const KYC_LEVEL_BASIC: u8 = 1;
pub const KYC_LEVEL_ENHANCED: u8 = 2;
pub const KYC_LEVEL_INSTITUTIONAL: u8 = 3;

// Pyth magic
pub const PYTH_MAGIC: u32 = 0xa1b2c3d4;
