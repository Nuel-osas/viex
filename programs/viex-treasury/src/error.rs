use anchor_lang::prelude::*;

#[error_code]
pub enum ViexError {
    // Core errors (inherited from SSS)
    #[msg("Stablecoin is paused")]
    Paused,
    #[msg("Not authorized")]
    Unauthorized,
    #[msg("Address is blacklisted")]
    Blacklisted,
    #[msg("Account is frozen")]
    Frozen,
    #[msg("Minter quota exceeded")]
    MinterQuotaExceeded,
    #[msg("Supply cap exceeded")]
    SupplyCapExceeded,
    #[msg("Invalid name length")]
    InvalidName,
    #[msg("Invalid symbol length")]
    InvalidSymbol,
    #[msg("Invalid URI length")]
    InvalidUri,
    #[msg("Invalid decimals")]
    InvalidDecimals,
    #[msg("Compliance not enabled on this stablecoin")]
    ComplianceNotEnabled,
    #[msg("Allowlist not enabled on this stablecoin")]
    AllowlistNotEnabled,
    #[msg("Already blacklisted")]
    AlreadyBlacklisted,
    #[msg("Not blacklisted")]
    NotBlacklisted,
    #[msg("Already on allowlist")]
    AlreadyOnAllowlist,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Authority transfer not pending")]
    NoPendingAuthority,
    #[msg("Invalid pending authority")]
    InvalidPendingAuthority,
    #[msg("Reason too long")]
    ReasonTooLong,

    // Oracle errors
    #[msg("Oracle price is stale")]
    OraclePriceStale,
    #[msg("Oracle price deviates from peg")]
    OraclePriceDepegged,
    #[msg("Invalid oracle account")]
    InvalidOracleAccount,

    // Treasury errors (new)
    #[msg("Treasury already initialized")]
    TreasuryAlreadyInitialized,
    #[msg("Mint not registered in treasury")]
    MintNotInTreasury,
    #[msg("Treasury full — maximum mints reached")]
    TreasuryFull,
    #[msg("Mint already registered in treasury")]
    MintAlreadyRegistered,
    #[msg("Same currency conversion not allowed")]
    SameCurrencyConversion,
    #[msg("FX rate is stale")]
    FxRateStale,
    #[msg("FX slippage exceeds maximum")]
    FxSlippageExceeded,
    #[msg("Invalid FX rate")]
    InvalidFxRate,

    // KYC errors (new)
    #[msg("KYC not approved")]
    KycNotApproved,
    #[msg("KYC expired")]
    KycExpired,
    #[msg("KYC level insufficient")]
    KycLevelInsufficient,
    #[msg("Invalid KYC level")]
    InvalidKycLevel,
    #[msg("Invalid jurisdiction code")]
    InvalidJurisdiction,

    // Travel Rule errors (new)
    #[msg("Travel rule data required for this transfer amount")]
    TravelRuleRequired,
    #[msg("Originator name required")]
    OriginatorNameRequired,
    #[msg("Beneficiary name required")]
    BeneficiaryNameRequired,
    #[msg("VASP ID required")]
    VaspIdRequired,
    #[msg("Travel rule data too long")]
    TravelRuleDataTooLong,

    // Close / rent reclamation errors
    #[msg("Account is still active — deactivate before closing")]
    AccountStillActive,
}
