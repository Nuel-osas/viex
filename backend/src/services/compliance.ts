import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import {
  program,
  operatorKeypair,
  findStablecoinPda,
  findBlacklistEntryPda,
  findRoleAssignmentPda,
} from "../config";
import { createError } from "../middleware/error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlacklistEntryState {
  stablecoin: string;
  address: string;
  reason: string;
  active: boolean;
  blacklistedAt: number;
  blacklistedBy: string;
}

// ---------------------------------------------------------------------------
// Blacklist
// ---------------------------------------------------------------------------

export async function addToBlacklist(
  mintPubkey: PublicKey,
  targetPubkey: PublicKey,
  reason: string
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [blacklistEntry] = findBlacklistEntryPda(stablecoinPda, targetPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "blacklister",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .addToBlacklist(reason)
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        target: targetPubkey,
        blacklistEntry,
        roleAssignment,
        systemProgram: SystemProgram.programId,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Add to blacklist failed: ${err.message}`, 500);
  }
}

export async function removeFromBlacklist(
  mintPubkey: PublicKey,
  targetPubkey: PublicKey
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [blacklistEntry] = findBlacklistEntryPda(stablecoinPda, targetPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "blacklister",
    operatorKeypair.publicKey
  );

  try {
    const tx = await (program.methods as any)
      .removeFromBlacklist()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        blacklistEntry,
        roleAssignment,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Remove from blacklist failed: ${err.message}`, 500);
  }
}

export async function checkBlacklist(
  mintPubkey: PublicKey,
  targetPubkey: PublicKey
): Promise<BlacklistEntryState | null> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [blacklistEntry] = findBlacklistEntryPda(stablecoinPda, targetPubkey);

  try {
    const account = await (program.account as any).blacklistEntry.fetch(
      blacklistEntry
    );
    return {
      stablecoin: account.stablecoin.toBase58(),
      address: account.address.toBase58(),
      reason: account.reason,
      active: account.active,
      blacklistedAt: account.blacklistedAt.toNumber(),
      blacklistedBy: account.blacklistedBy.toBase58(),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Seize tokens
// ---------------------------------------------------------------------------

export async function seizeTokens(
  mintPubkey: PublicKey,
  sourceTokenAccountPubkey: PublicKey,
  treasuryTokenAccountPubkey: PublicKey
): Promise<string> {
  const [stablecoinPda] = findStablecoinPda(mintPubkey);
  const [roleAssignment] = findRoleAssignmentPda(
    stablecoinPda,
    "seizer",
    operatorKeypair.publicKey
  );

  // Derive the blacklist entry from the source token account owner
  // The seize instruction expects the blacklist entry for the token account owner
  try {
    const tx = await (program.methods as any)
      .seize()
      .accounts({
        authority: operatorKeypair.publicKey,
        stablecoin: stablecoinPda,
        mint: mintPubkey,
        sourceTokenAccount: sourceTokenAccountPubkey,
        treasuryTokenAccount: treasuryTokenAccountPubkey,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`Seize failed: ${err.message}`, 500);
  }
}
