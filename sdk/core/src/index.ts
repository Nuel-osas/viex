// ── VIEX Treasury SDK ───────────────────────────────────────────────────────
//
// Main entry point. Re-exports everything consumers need.
//

export { ViexTreasury } from "./treasury";
export { ComplianceModule } from "./compliance";
export { KycModule } from "./kyc";
export { TravelRuleModule } from "./travel-rule";

export {
  findTreasuryPDA,
  findStablecoinPDA,
  findRolePDA,
  findMinterInfoPDA,
  findBlacklistPDA,
  findAllowlistPDA,
  findKycPDA,
  findTravelRulePDA,
  findFxPairPDA,
  findOracleConfigPDA,
} from "./pda";

export {
  // Program IDs
  VIEX_TREASURY_PROGRAM_ID,
  VIEX_TRANSFER_HOOK_PROGRAM_ID,

  // Enums
  Role,
  KycLevel,
  Presets,

  // Enum helpers
  roleToAnchor,
  roleToSeedString,
  kycLevelToU8,

  // Config types
  type StablecoinInitConfig,
  type CreateTreasuryOpts,
  type TravelRuleOriginator,
  type TravelRuleBeneficiary,

  // Account types
  type TreasuryAccount,
  type StablecoinAccount,
  type RoleAssignmentAccount,
  type MinterInfoAccount,
  type BlacklistEntryAccount,
  type AllowlistEntryAccount,
  type KycEntryAccount,
  type TravelRuleMessageAccount,
  type FxPairConfigAccount,
  type OracleConfigAccount,
} from "./types";
