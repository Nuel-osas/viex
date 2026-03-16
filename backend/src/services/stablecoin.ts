import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  program,
  connection,
  operatorKeypair,
  findStablecoinPda,
  findRoleAssignmentPda,
  findMinterInfoPda,
  VIEX_TREASURY_PROGRAM_ID,
} from "../config";
import { createError } from "../middleware/error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StablecoinState {
  authority: string;
  mint: string;
  treasury: string;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  paused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  enableAllowlist: boolean;
  totalMinted: string;
  totalBurned: string;
  supplyCap: string;
  pendingAuthority: string | null;
}

export interface SupplyBreakdown {
  mint: string;
  totalMinted: string;
  totalBurned: string;
  circulating: string;
  supplyCap: string;
  currentSupply: string;
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export async function getStablecoinState(
  mintPubkey: PublicKey
): Promise<StablecoinState> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  try {
    const account = await (program.account as any).stablecoin.fetch(
      stablecoinPda
    );
    return {
      authority: account.authority.toBase58(),
      mint: account.mint.toBase58(),
      treasury: account.treasury.toBase58(),
      name: account.name,
      symbol: account.symbol,
      uri: account.uri,
      decimals: account.decimals,
      paused: account.paused,
      enablePermanentDelegate: account.enablePermanentDelegate,
      enableTransferHook: account.enableTransferHook,
      enableAllowlist: account.enableAllowlist,
      totalMinted: account.totalMinted.toString(),
      totalBurned: account.totalBurned.toString(),
      supplyCap: account.supplyCap.toString(),
      pendingAuthority: account.pendingAuthority
        ? account.pendingAuthority.toBase58()
        : null,
    };
  } catch (err: any) {
    throw createError(
      `Failed to fetch stablecoin state: ${err.message}`,
      404
    );
  }
}

export async function getSupplyBreakdown(
  mintPubkey: PublicKey
): Promise<SupplyBreakdown> {
  const state = await getStablecoinState(mintPubkey);

  let currentSupply = "0";
  try {
    const mintInfo = await connection.getTokenSupply(mintPubkey);
    currentSupply = mintInfo.value.amount;
  } catch {
    // If token mint doesn't exist yet, supply is 0
  }

  const totalMinted = BigInt(state.totalMinted);
  const totalBurned = BigInt(state.totalBurned);
  const circulating = totalMinted - totalBurned;

  return {
    mint: mintPubkey.toBase58(),
    totalMinted: state.totalMinted,
    totalBurned: state.totalBurned,
    circulating: circulating.toString(),
    supplyCap: state.supplyCap,
    currentSupply,
  };
}

// ---------------------------------------------------------------------------
// Mint tokens
// ---------------------------------------------------------------------------

export async function mintTokens(
  mintPubkey: PublicKey,
  recipientPubkey: PublicKey,
  amount: number | string
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "minter",
    operatorKeypair.publicKey
  );
  const [minterInfo] = findMinterInfoPda(
    stablecoinPda,
    operatorKeypair.publicKey
  );

  const recipientTokenAccount = getAssociatedTokenAddressSync(
    mintPubkey,
    recipientPubkey,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const tx = await (program.methods as any)
      .mintTokens(new BN(amount.toString()))
      .accounts({
        minter: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        roleAssignment,
        minterInfo,
        recipientTokenAccount,
        oracleConfig: null,
        priceFeed: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Mint failed: ${err.message}`, 500);
  }
}

// ---------------------------------------------------------------------------
// Burn tokens
// ---------------------------------------------------------------------------

export async function burnTokens(
  mintPubkey: PublicKey,
  amount: number | string
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "burner",
    operatorKeypair.publicKey
  );

  const burnerTokenAccount = getAssociatedTokenAddressSync(
    mintPubkey,
    operatorKeypair.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const tx = await (program.methods as any)
      .burnTokens(new BN(amount.toString()))
      .accounts({
        burner: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        roleAssignment,
        burnerTokenAccount,
        oracleConfig: null,
        priceFeed: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Burn failed: ${err.message}`, 500);
  }
}

// ---------------------------------------------------------------------------
// Freeze / Thaw
// ---------------------------------------------------------------------------

export async function freezeAccount(
  mintPubkey: PublicKey,
  tokenAccountPubkey: PublicKey
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "blacklister",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .freezeAccount()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        tokenAccount: tokenAccountPubkey,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Freeze failed: ${err.message}`, 500);
  }
}

export async function thawAccount(
  mintPubkey: PublicKey,
  tokenAccountPubkey: PublicKey
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "blacklister",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .thawAccount()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        tokenAccount: tokenAccountPubkey,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Thaw failed: ${err.message}`, 500);
  }
}

// ---------------------------------------------------------------------------
// Pause / Unpause
// ---------------------------------------------------------------------------

export async function pauseStablecoin(mintPubkey: PublicKey): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "pauser",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .pause()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        roleAssignment,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Pause failed: ${err.message}`, 500);
  }
}

export async function unpauseStablecoin(mintPubkey: PublicKey): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "pauser",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .unpause()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        roleAssignment,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Unpause failed: ${err.message}`, 500);
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

const ROLE_MAP: Record<string, object> = {
  minter: { minter: {} },
  burner: { burner: {} },
  blacklister: { blacklister: {} },
  pauser: { pauser: {} },
  seizer: { seizer: {} },
};

export async function assignRole(
  mintPubkey: PublicKey,
  role: string,
  assigneePubkey: PublicKey
): Promise<string> {
  const roleLower = role.toLowerCase();
  const roleEnum = ROLE_MAP[roleLower];
  if (!roleEnum) {
    throw createError(
      `Invalid role: ${role}. Valid roles: ${Object.keys(ROLE_MAP).join(", ")}`,
      400
    );
  }

  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    roleLower,
    assigneePubkey
  );
  const [minterInfo] = findMinterInfoPda(stablecoinPda, assigneePubkey);

  try {
    const tx = await (program.methods as any)
      .assignRole(roleEnum)
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        assignee: assigneePubkey,
        roleAssignment,
        minterInfo: roleLower === "minter" ? minterInfo : null,
        systemProgram: SystemProgram.programId,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Assign role failed: ${err.message}`, 500);
  }
}

export async function revokeRole(
  mintPubkey: PublicKey,
  role: string,
  assigneePubkey: PublicKey
): Promise<string> {
  const roleLower = role.toLowerCase();
  if (!ROLE_MAP[roleLower]) {
    throw createError(`Invalid role: ${role}`, 400);
  }

  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    roleLower,
    assigneePubkey
  );

  try {
    const tx = await (program.methods as any)
      .revokeRole()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        roleAssignment,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Revoke role failed: ${err.message}`, 500);
  }
}
