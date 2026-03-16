import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  program,
  operatorKeypair,
  findTreasuryPda,
  findKycEntryPda,
} from "../config";
import { createError } from "../middleware/error";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KycEntryState {
  treasury: string;
  address: string;
  kycLevel: string;
  jurisdiction: string;
  provider: string;
  approvedAt: number;
  expiresAt: number;
  approvedBy: string;
  active: boolean;
}

const KYC_LEVEL_MAP: Record<string, number> = {
  basic: 0,
  enhanced: 1,
  institutional: 2,
};

const KYC_LEVEL_REVERSE: Record<number, string> = {
  0: "Basic",
  1: "Enhanced",
  2: "Institutional",
};

// ---------------------------------------------------------------------------
// KYC Operations
// ---------------------------------------------------------------------------

export async function approveKyc(
  targetPubkey: PublicKey,
  level: string,
  jurisdiction: string,
  provider: string,
  expiresAt: number
): Promise<string> {
  const [treasuryPda] = findTreasuryPda(operatorKeypair.publicKey);
  const [kycEntry] = findKycEntryPda(treasuryPda, targetPubkey);

  const kycLevel = KYC_LEVEL_MAP[level.toLowerCase()];
  if (kycLevel === undefined) {
    throw createError(
      `Invalid KYC level: ${level}. Valid: basic, enhanced, institutional`,
      400
    );
  }

  // Convert jurisdiction string (e.g. "USA") to 3-byte array
  const jurisdictionBytes = Buffer.alloc(3);
  Buffer.from(jurisdiction.substring(0, 3).toUpperCase()).copy(
    jurisdictionBytes
  );

  try {
    const tx = await (program.methods as any)
      .kycApprove(
        kycLevel,
        Array.from(jurisdictionBytes),
        provider,
        new BN(expiresAt)
      )
      .accounts({
        authority: operatorKeypair.publicKey,
        treasury: treasuryPda,
        target: targetPubkey,
        kycEntry,
        systemProgram: SystemProgram.programId,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`KYC approve failed: ${err.message}`, 500);
  }
}

export async function revokeKyc(targetPubkey: PublicKey): Promise<string> {
  const [treasuryPda] = findTreasuryPda(operatorKeypair.publicKey);
  const [kycEntry] = findKycEntryPda(treasuryPda, targetPubkey);

  try {
    const tx = await (program.methods as any)
      .kycRevoke()
      .accounts({
        authority: operatorKeypair.publicKey,
        treasury: treasuryPda,
        kycEntry,
      })
      .signers([operatorKeypair])
      .rpc();
    return tx;
  } catch (err: any) {
    throw createError(`KYC revoke failed: ${err.message}`, 500);
  }
}

export async function getKycStatus(
  targetPubkey: PublicKey
): Promise<KycEntryState | null> {
  const [treasuryPda] = findTreasuryPda(operatorKeypair.publicKey);
  const [kycEntry] = findKycEntryPda(treasuryPda, targetPubkey);

  try {
    const account = await (program.account as any).kycEntry.fetch(kycEntry);

    // Decode jurisdiction bytes to string
    const jurisdictionBytes: number[] = account.jurisdiction;
    const jurisdiction = Buffer.from(jurisdictionBytes)
      .toString("utf-8")
      .replace(/\0/g, "");

    // Decode KYC level
    let kycLevelStr = "Unknown";
    if (account.kycLevel.basic !== undefined) kycLevelStr = "Basic";
    else if (account.kycLevel.enhanced !== undefined)
      kycLevelStr = "Enhanced";
    else if (account.kycLevel.institutional !== undefined)
      kycLevelStr = "Institutional";

    return {
      treasury: account.treasury.toBase58(),
      address: account.address.toBase58(),
      kycLevel: kycLevelStr,
      jurisdiction,
      provider: account.provider,
      approvedAt: account.approvedAt.toNumber(),
      expiresAt: account.expiresAt.toNumber(),
      approvedBy: account.approvedBy.toBase58(),
      active: account.active,
    };
  } catch {
    return null;
  }
}
