import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ── Program ID ──────────────────────────────────────────────────────────────

export const VIEX_TREASURY_PROGRAM_ID = new PublicKey(
  "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU"
);

export const VIEX_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY"
);

// ── Enums ───────────────────────────────────────────────────────────────────

export enum Role {
  Minter = "minter",
  Burner = "burner",
  Blacklister = "blacklister",
  Pauser = "pauser",
  Seizer = "seizer",
}

export enum KycLevel {
  Basic = "basic",
  Enhanced = "enhanced",
  Institutional = "institutional",
}

/** Maps SDK Role enum to the Anchor IDL variant object */
export function roleToAnchor(role: Role): object {
  switch (role) {
    case Role.Minter:
      return { minter: {} };
    case Role.Burner:
      return { burner: {} };
    case Role.Blacklister:
      return { blacklister: {} };
    case Role.Pauser:
      return { pauser: {} };
    case Role.Seizer:
      return { seizer: {} };
  }
}

/** Maps SDK Role enum to the PDA seed string used on-chain */
export function roleToSeedString(role: Role): string {
  return role;
}

/** Maps SDK KycLevel enum to the u8 value expected by the instruction */
export function kycLevelToU8(level: KycLevel): number {
  switch (level) {
    case KycLevel.Basic:
      return 0;
    case KycLevel.Enhanced:
      return 1;
    case KycLevel.Institutional:
      return 2;
  }
}

// ── Preset configs for stablecoin initialization ────────────────────────────

export interface StablecoinInitConfig {
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  enableAllowlist: boolean;
  enableDefaultAccountState: boolean;
  enableConfidentialTransfer: boolean;
}

export const Presets = {
  /** Basic stablecoin with no extra features */
  basic: (): StablecoinInitConfig => ({
    enablePermanentDelegate: false,
    enableTransferHook: false,
    enableAllowlist: false,
    enableDefaultAccountState: false,
    enableConfidentialTransfer: false,
  }),

  /** Full compliance: permanent delegate + transfer hook + allowlist + frozen-by-default */
  compliance: (): StablecoinInitConfig => ({
    enablePermanentDelegate: true,
    enableTransferHook: true,
    enableAllowlist: true,
    enableDefaultAccountState: true,
    enableConfidentialTransfer: false,
  }),

  /** Transfer hook only */
  hookOnly: (): StablecoinInitConfig => ({
    enablePermanentDelegate: false,
    enableTransferHook: true,
    enableAllowlist: false,
    enableDefaultAccountState: false,
    enableConfidentialTransfer: false,
  }),
} as const;

// ── On-chain account types ──────────────────────────────────────────────────

export interface TreasuryAccount {
  authority: PublicKey;
  name: string;
  mints: PublicKey[];
  baseCurrency: string;
  travelRuleThreshold: BN;
  kycRequired: boolean;
  createdAt: BN;
  bump: number;
}

export interface StablecoinAccount {
  authority: PublicKey;
  mint: PublicKey;
  treasury: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  paused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  enableAllowlist: boolean;
  totalMinted: BN;
  totalBurned: BN;
  supplyCap: BN;
  pendingAuthority: PublicKey | null;
  bump: number;
}

export interface RoleAssignmentAccount {
  stablecoin: PublicKey;
  role: object;
  assignee: PublicKey;
  active: boolean;
  grantedBy: PublicKey;
  grantedAt: BN;
  bump: number;
}

export interface MinterInfoAccount {
  stablecoin: PublicKey;
  minter: PublicKey;
  quota: BN;
  minted: BN;
  bump: number;
}

export interface BlacklistEntryAccount {
  stablecoin: PublicKey;
  address: PublicKey;
  reason: string;
  active: boolean;
  blacklistedAt: BN;
  blacklistedBy: PublicKey;
  bump: number;
}

export interface AllowlistEntryAccount {
  stablecoin: PublicKey;
  address: PublicKey;
  addedAt: BN;
  addedBy: PublicKey;
  bump: number;
}

export interface KycEntryAccount {
  treasury: PublicKey;
  address: PublicKey;
  kycLevel: object;
  jurisdiction: number[];
  provider: string;
  approvedAt: BN;
  expiresAt: BN;
  approvedBy: PublicKey;
  active: boolean;
  bump: number;
}

export interface TravelRuleMessageAccount {
  treasury: PublicKey;
  transferSignature: number[];
  sourceMint: PublicKey;
  amount: BN;
  originatorName: string;
  originatorVasp: string;
  originatorAccount: PublicKey;
  beneficiaryName: string;
  beneficiaryVasp: string;
  beneficiaryAccount: PublicKey;
  createdAt: BN;
  createdBy: PublicKey;
  bump: number;
}

export interface FxPairConfigAccount {
  treasury: PublicKey;
  sourceMint: PublicKey;
  destMint: PublicKey;
  priceFeed: PublicKey;
  maxStalenessSecs: BN;
  maxSlippageBps: number;
  enabled: boolean;
  bump: number;
}

export interface OracleConfigAccount {
  stablecoin: PublicKey;
  priceFeed: PublicKey;
  maxDeviationBps: number;
  maxStalenessSecs: BN;
  enabled: boolean;
  bump: number;
}

// ── Parameter types ─────────────────────────────────────────────────────────

export interface CreateTreasuryOpts {
  travelRuleThreshold?: BN;
  kycRequired?: boolean;
  programId?: PublicKey;
}

export interface TravelRuleOriginator {
  name: string;
  vasp: string;
}

export interface TravelRuleBeneficiary {
  name: string;
  vasp: string;
}
