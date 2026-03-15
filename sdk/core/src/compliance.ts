import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  findBlacklistPDA,
  findAllowlistPDA,
  findRolePDA,
  findStablecoinPDA,
} from "./pda";
import type {
  BlacklistEntryAccount,
  AllowlistEntryAccount,
} from "./types";

/**
 * ComplianceModule handles blacklist, allowlist, and seizure operations
 * for a specific VIEX Treasury instance.
 */
export class ComplianceModule {
  constructor(
    private readonly program: Program<any>,
    private readonly authority: PublicKey,
    private readonly treasuryAddress: PublicKey
  ) {}

  // ── Blacklist ───────────────────────────────────────────────────────────

  /**
   * Add an address to the blacklist for a given stablecoin mint.
   */
  async blacklistAdd(
    mint: PublicKey,
    address: PublicKey,
    reason: string
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [blacklistEntry] = findBlacklistPDA(
      stablecoin,
      address,
      this.program.programId
    );
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "blacklister",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .addToBlacklist(reason)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        target: address,
        blacklistEntry,
        roleAssignment,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Remove an address from the blacklist (deactivate, account stays open).
   */
  async blacklistRemove(mint: PublicKey, address: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [blacklistEntry] = findBlacklistPDA(
      stablecoin,
      address,
      this.program.programId
    );
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "blacklister",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .removeFromBlacklist()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        blacklistEntry,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Close a deactivated blacklist entry to reclaim rent.
   */
  async blacklistClose(mint: PublicKey, address: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [blacklistEntry] = findBlacklistPDA(
      stablecoin,
      address,
      this.program.programId
    );
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "blacklister",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .closeBlacklistEntry()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        blacklistEntry,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Check if an address is currently blacklisted for a given mint.
   */
  async isBlacklisted(mint: PublicKey, address: PublicKey): Promise<boolean> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [blacklistEntry] = findBlacklistPDA(
      stablecoin,
      address,
      this.program.programId
    );
    try {
      const account = await this.program.account.blacklistEntry.fetch(
        blacklistEntry
      ) as unknown as BlacklistEntryAccount;
      return account.active;
    } catch {
      return false;
    }
  }

  /**
   * Seize tokens from a blacklisted address. The source account must belong to
   * a blacklisted address. Tokens are transferred to a treasury-controlled account
   * using the permanent delegate authority.
   */
  async seize(
    mint: PublicKey,
    sourceAccount: PublicKey,
    treasuryTokenAccount: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);

    // Derive the blacklist entry from the source token account owner.
    // The caller is responsible for providing the correct source account.
    // The on-chain program verifies the blacklist entry exists.
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "seizer",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .seize()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        sourceTokenAccount: sourceAccount,
        treasuryTokenAccount: treasuryTokenAccount,
        blacklistEntry: null, // The program expects this; derive from on-chain data
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Seize tokens with explicit blacklist entry PDA.
   */
  async seizeWithBlacklist(
    mint: PublicKey,
    sourceAccount: PublicKey,
    treasuryTokenAccount: PublicKey,
    blacklistedAddress: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [blacklistEntry] = findBlacklistPDA(
      stablecoin,
      blacklistedAddress,
      this.program.programId
    );
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "seizer",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .seize()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        sourceTokenAccount: sourceAccount,
        treasuryTokenAccount,
        blacklistEntry,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  // ── Allowlist ─────────────────────────────────────────────────────────────

  /**
   * Add an address to the allowlist for a given stablecoin mint.
   */
  async allowlistAdd(mint: PublicKey, address: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [allowlistEntry] = findAllowlistPDA(
      stablecoin,
      address,
      this.program.programId
    );

    return this.program.methods
      .addToAllowlist()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        target: address,
        allowlistEntry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Remove an address from the allowlist (closes the account, reclaims rent).
   */
  async allowlistRemove(mint: PublicKey, address: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [allowlistEntry] = findAllowlistPDA(
      stablecoin,
      address,
      this.program.programId
    );

    return this.program.methods
      .removeFromAllowlist()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        allowlistEntry,
      })
      .rpc();
  }

  /**
   * Check if an address is on the allowlist for a given mint.
   */
  async isAllowlisted(mint: PublicKey, address: PublicKey): Promise<boolean> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [allowlistEntry] = findAllowlistPDA(
      stablecoin,
      address,
      this.program.programId
    );
    try {
      await this.program.account.allowlistEntry.fetch(allowlistEntry);
      return true;
    } catch {
      return false;
    }
  }
}
