export const PROGRAM_ERRORS: Record<number, { name: string; msg: string }> = {
  6000: { name: "Paused", msg: "Stablecoin is paused" },
  6001: { name: "Unauthorized", msg: "Not authorized" },
  6002: { name: "Blacklisted", msg: "Address is blacklisted" },
  6003: { name: "Frozen", msg: "Account is frozen" },
  6004: { name: "MinterQuotaExceeded", msg: "Minter quota exceeded" },
  6005: { name: "SupplyCapExceeded", msg: "Supply cap exceeded" },
  6006: { name: "InvalidName", msg: "Invalid name length" },
  6007: { name: "InvalidSymbol", msg: "Invalid symbol length" },
  6008: { name: "InvalidUri", msg: "Invalid URI length" },
  6009: { name: "InvalidDecimals", msg: "Invalid decimals" },
  6010: { name: "ComplianceNotEnabled", msg: "Compliance not enabled on this stablecoin" },
  6011: { name: "AllowlistNotEnabled", msg: "Allowlist not enabled on this stablecoin" },
  6012: { name: "AlreadyBlacklisted", msg: "Already blacklisted" },
  6013: { name: "NotBlacklisted", msg: "Not blacklisted" },
  6014: { name: "AlreadyOnAllowlist", msg: "Already on allowlist" },
  6015: { name: "MathOverflow", msg: "Math overflow" },
  6016: { name: "InvalidAuthority", msg: "Invalid authority" },
  6017: { name: "NoPendingAuthority", msg: "Authority transfer not pending" },
  6018: { name: "InvalidPendingAuthority", msg: "Invalid pending authority" },
  6019: { name: "ReasonTooLong", msg: "Reason too long" },
  6020: { name: "OraclePriceStale", msg: "Oracle price is stale" },
  6021: { name: "OraclePriceDepegged", msg: "Oracle price deviates from peg" },
  6022: { name: "InvalidOracleAccount", msg: "Invalid oracle account" },
  6023: { name: "TreasuryAlreadyInitialized", msg: "Treasury already initialized" },
  6024: { name: "MintNotInTreasury", msg: "Mint not registered in treasury" },
  6025: { name: "TreasuryFull", msg: "Treasury full - maximum mints reached" },
  6026: { name: "MintAlreadyRegistered", msg: "Mint already registered in treasury" },
  6027: { name: "SameCurrencyConversion", msg: "Same currency conversion not allowed" },
  6028: { name: "FxRateStale", msg: "FX rate is stale" },
  6029: { name: "FxSlippageExceeded", msg: "FX slippage exceeds maximum" },
  6030: { name: "InvalidFxRate", msg: "Invalid FX rate" },
  6031: { name: "KycNotApproved", msg: "KYC not approved" },
  6032: { name: "KycExpired", msg: "KYC expired" },
  6033: { name: "KycLevelInsufficient", msg: "KYC level insufficient" },
  6034: { name: "InvalidKycLevel", msg: "Invalid KYC level" },
  6035: { name: "InvalidJurisdiction", msg: "Invalid jurisdiction code" },
  6036: { name: "TravelRuleRequired", msg: "Travel rule data required for this transfer amount" },
  6037: { name: "OriginatorNameRequired", msg: "Originator name required" },
  6038: { name: "BeneficiaryNameRequired", msg: "Beneficiary name required" },
  6039: { name: "VaspIdRequired", msg: "VASP ID required" },
  6040: { name: "TravelRuleDataTooLong", msg: "Travel rule data too long" },
  6041: { name: "AccountStillActive", msg: "Account is still active - deactivate before closing" },
};

export function parseError(err: any): string {
  if (err?.error?.errorCode?.number) {
    const code = err.error.errorCode.number;
    const found = PROGRAM_ERRORS[code];
    if (found) return `${found.name}: ${found.msg}`;
  }

  if (err?.message) {
    const match = err.message.match(/custom program error: 0x([0-9a-fA-F]+)/);
    if (match) {
      const code = parseInt(match[1], 16);
      const found = PROGRAM_ERRORS[code];
      if (found) return `${found.name}: ${found.msg}`;
    }
  }

  if (typeof err === "string") return err;
  if (err?.message) return err.message;
  return "Unknown error occurred";
}
