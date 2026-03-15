import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { findTreasuryPDA, findKycPDA } from "./pda";
import { KycLevel, kycLevelToU8 } from "./types";
import type { KycEntryAccount } from "./types";

/**
 * KycModule handles KYC entry management for a VIEX Treasury.
 * KYC entries are scoped to the treasury (not per-stablecoin).
 */
export class KycModule {
  constructor(
    private readonly program: Program<any>,
    private readonly authority: PublicKey,
    private readonly treasuryAddress: PublicKey
  ) {}

  /**
   * Approve a KYC entry for a given address.
   *
   * @param address     - The wallet address to approve.
   * @param level       - KYC level (Basic, Enhanced, Institutional).
   * @param jurisdiction - 3-letter ISO country code as a string (e.g. "USA").
   * @param provider    - Name of the KYC provider (e.g. "Sumsub").
   * @param expiresAt   - Unix timestamp (seconds) when the KYC expires.
   */
  async approve(
    address: PublicKey,
    level: KycLevel,
    jurisdiction: string,
    provider: string,
    expiresAt: BN | number
  ): Promise<string> {
    const [kycEntry] = findKycPDA(
      this.treasuryAddress,
      address,
      this.program.programId
    );

    // Convert jurisdiction string to 3-byte array
    const jurisdictionBytes = Array.from(
      Buffer.from(jurisdiction.slice(0, 3).padEnd(3, "\0"))
    );

    const expiresAtBn = typeof expiresAt === "number" ? new BN(expiresAt) : expiresAt;

    return this.program.methods
      .kycApprove(kycLevelToU8(level), jurisdictionBytes, provider, expiresAtBn)
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        target: address,
        kycEntry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Revoke KYC approval for an address (deactivates, keeps account open).
   */
  async revoke(address: PublicKey): Promise<string> {
    const [kycEntry] = findKycPDA(
      this.treasuryAddress,
      address,
      this.program.programId
    );

    return this.program.methods
      .kycRevoke()
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        kycEntry,
      })
      .rpc();
  }

  /**
   * Close a deactivated KYC entry to reclaim rent.
   */
  async close(address: PublicKey): Promise<string> {
    const [kycEntry] = findKycPDA(
      this.treasuryAddress,
      address,
      this.program.programId
    );

    return this.program.methods
      .kycClose()
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        kycEntry,
      })
      .rpc();
  }

  /**
   * Fetch a KYC entry. Returns null if the account does not exist.
   */
  async getEntry(address: PublicKey): Promise<KycEntryAccount | null> {
    const [kycEntry] = findKycPDA(
      this.treasuryAddress,
      address,
      this.program.programId
    );
    try {
      return (await this.program.account.kycEntry.fetch(
        kycEntry
      )) as unknown as KycEntryAccount;
    } catch {
      return null;
    }
  }

  /**
   * Check if an address has active, non-expired KYC.
   */
  async isApproved(address: PublicKey): Promise<boolean> {
    const entry = await this.getEntry(address);
    if (!entry || !entry.active) return false;

    const now = Math.floor(Date.now() / 1000);
    return entry.expiresAt.toNumber() > now;
  }
}
