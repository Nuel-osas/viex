import { PublicKey } from "@solana/web3.js";

export const VIEX_TREASURY_PROGRAM_ID = new PublicKey(
  "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU"
);

export const VIEX_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY"
);

export function findTreasuryPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), authority.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findStablecoinPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin"), mint.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findBlacklistPDA(
  stablecoin: PublicKey,
  target: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("blacklist"), stablecoin.toBuffer(), target.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findAllowlistPDA(
  stablecoin: PublicKey,
  target: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("allowlist"), stablecoin.toBuffer(), target.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findRolePDA(
  stablecoin: PublicKey,
  role: string,
  assignee: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("role"),
      stablecoin.toBuffer(),
      Buffer.from(role),
      assignee.toBuffer(),
    ],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findMinterInfoPDA(
  stablecoin: PublicKey,
  minter: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("minter_info"), stablecoin.toBuffer(), minter.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findKycPDA(
  treasury: PublicKey,
  target: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("kyc"), treasury.toBuffer(), target.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findTravelRulePDA(
  treasury: PublicKey,
  sigHash: Uint8Array
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("travel_rule"), treasury.toBuffer(), Buffer.from(sigHash)],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findFxPairPDA(
  treasury: PublicKey,
  sourceMint: PublicKey,
  destMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("fx_pair"),
      treasury.toBuffer(),
      sourceMint.toBuffer(),
      destMint.toBuffer(),
    ],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findOracleConfigPDA(
  stablecoin: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_config"), stablecoin.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}
