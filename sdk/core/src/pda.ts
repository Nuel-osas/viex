import { PublicKey } from "@solana/web3.js";
import { VIEX_TREASURY_PROGRAM_ID } from "./types";

// ── Seed constants ──────────────────────────────────────────────────────────

const TREASURY_SEED = Buffer.from("treasury");
const STABLECOIN_SEED = Buffer.from("stablecoin");
const ROLE_SEED = Buffer.from("role");
const MINTER_INFO_SEED = Buffer.from("minter_info");
const BLACKLIST_SEED = Buffer.from("blacklist");
const ALLOWLIST_SEED = Buffer.from("allowlist");
const KYC_SEED = Buffer.from("kyc");
const TRAVEL_RULE_SEED = Buffer.from("travel_rule");
const FX_PAIR_SEED = Buffer.from("fx_pair");
const ORACLE_CONFIG_SEED = Buffer.from("oracle_config");

// ── PDA derivation functions ────────────────────────────────────────────────

export function findTreasuryPDA(
  authority: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TREASURY_SEED, authority.toBuffer()],
    programId
  );
}

export function findStablecoinPDA(
  mint: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STABLECOIN_SEED, mint.toBuffer()],
    programId
  );
}

export function findRolePDA(
  stablecoin: PublicKey,
  role: string,
  assignee: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      ROLE_SEED,
      stablecoin.toBuffer(),
      Buffer.from(role),
      assignee.toBuffer(),
    ],
    programId
  );
}

export function findMinterInfoPDA(
  stablecoin: PublicKey,
  minter: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MINTER_INFO_SEED, stablecoin.toBuffer(), minter.toBuffer()],
    programId
  );
}

export function findBlacklistPDA(
  stablecoin: PublicKey,
  address: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BLACKLIST_SEED, stablecoin.toBuffer(), address.toBuffer()],
    programId
  );
}

export function findAllowlistPDA(
  stablecoin: PublicKey,
  address: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ALLOWLIST_SEED, stablecoin.toBuffer(), address.toBuffer()],
    programId
  );
}

export function findKycPDA(
  treasury: PublicKey,
  address: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [KYC_SEED, treasury.toBuffer(), address.toBuffer()],
    programId
  );
}

export function findTravelRulePDA(
  treasury: PublicKey,
  transferSignature: Uint8Array | number[],
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TRAVEL_RULE_SEED, treasury.toBuffer(), Buffer.from(transferSignature)],
    programId
  );
}

export function findFxPairPDA(
  treasury: PublicKey,
  sourceMint: PublicKey,
  destMint: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      FX_PAIR_SEED,
      treasury.toBuffer(),
      sourceMint.toBuffer(),
      destMint.toBuffer(),
    ],
    programId
  );
}

export function findOracleConfigPDA(
  stablecoin: PublicKey,
  programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ORACLE_CONFIG_SEED, stablecoin.toBuffer()],
    programId
  );
}
