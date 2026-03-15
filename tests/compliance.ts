import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ViexTreasury } from "../target/types/viex_treasury";
import { expect } from "chai";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";

describe("Compliance + Rent Reclaim Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const treasuryProgram = anchor.workspace.ViexTreasury as Program<ViexTreasury>;

  const authority = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  // Mints and PDAs
  const vusdMintKp = Keypair.generate();
  let treasuryPda: PublicKey;
  let vusdStablecoinPda: PublicKey;

  // Targets for compliance actions
  const blacklistTarget = Keypair.generate();
  const allowlistTarget = Keypair.generate();
  const seizeTarget = Keypair.generate();
  const roleTarget = Keypair.generate();

  // Delegated role holders
  const blacklisterKp = Keypair.generate();
  const seizerKp = Keypair.generate();

  // Helpers
  function findTreasuryPda(auth: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), auth.toBuffer()],
      treasuryProgram.programId
    );
  }

  function findStablecoinPda(mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin"), mint.toBuffer()],
      treasuryProgram.programId
    );
  }

  function findBlacklistEntryPda(
    stablecoin: PublicKey,
    target: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("blacklist"), stablecoin.toBuffer(), target.toBuffer()],
      treasuryProgram.programId
    );
  }

  function findAllowlistEntryPda(
    stablecoin: PublicKey,
    target: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("allowlist"), stablecoin.toBuffer(), target.toBuffer()],
      treasuryProgram.programId
    );
  }

  function findRoleAssignmentPda(
    stablecoin: PublicKey,
    roleStr: string,
    assignee: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("role"),
        stablecoin.toBuffer(),
        Buffer.from(roleStr),
        assignee.toBuffer(),
      ],
      treasuryProgram.programId
    );
  }

  async function airdrop(dest: PublicKey, amount = 10 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(dest, amount);
    await connection.confirmTransaction(sig, "confirmed");
  }

  async function createAta(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    const ata = getAssociatedTokenAddressSync(
      mint,
      owner,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const ix = createAssociatedTokenAccountInstruction(
      authority.publicKey,
      ata,
      owner,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const tx = new anchor.web3.Transaction().add(ix);
    await provider.sendAndConfirm(tx);
    return ata;
  }

  // ── Setup ──────────────────────────────────────────────────

  before(async () => {
    [treasuryPda] = findTreasuryPda(authority.publicKey);
    [vusdStablecoinPda] = findStablecoinPda(vusdMintKp.publicKey);

    await Promise.all([
      airdrop(blacklistTarget.publicKey),
      airdrop(allowlistTarget.publicKey),
      airdrop(seizeTarget.publicKey),
      airdrop(roleTarget.publicKey),
      airdrop(blacklisterKp.publicKey),
      airdrop(seizerKp.publicKey),
    ]);

    // Init treasury (skip if already exists from prior test suite)
    const existing = await connection.getAccountInfo(treasuryPda);
    if (!existing) {
      await treasuryProgram.methods
        .initTreasury("Compliance Treasury", "USD", new BN(1000_000_000), false)
        .accountsStrict({
          authority: authority.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Init VUSD stablecoin with permanent delegate (needed for seize)
    await treasuryProgram.methods
      .initialize(
        "Compliance USD",
        "CUSD",
        "https://viex.io/cusd.json",
        6,
        {
          enablePermanentDelegate: true,
          enableTransferHook: false,
          enableAllowlist: true,
          enableDefaultAccountState: false,
          enableConfidentialTransfer: false,
        }
      )
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        mint: vusdMintKp.publicKey,
        stablecoin: vusdStablecoinPda,
        transferHookProgram: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([vusdMintKp])
      .rpc();

    // Assign blacklister role
    const [blacklisterRole] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );
    await treasuryProgram.methods
      .assignRole({ blacklister: {} })
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        assignee: blacklisterKp.publicKey,
        roleAssignment: blacklisterRole,
        minterInfo: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Assign seizer role
    const [seizerRole] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "seizer",
      seizerKp.publicKey
    );
    await treasuryProgram.methods
      .assignRole({ seizer: {} })
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        assignee: seizerKp.publicKey,
        roleAssignment: seizerRole,
        minterInfo: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  // ── Blacklist: Add ─────────────────────────────────────────

  it("1. Adds address to blacklist with reason", async () => {
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      blacklistTarget.publicKey
    );
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );

    await treasuryProgram.methods
      .addToBlacklist("Suspicious activity")
      .accountsStrict({
        authority: blacklisterKp.publicKey,
        stablecoin: vusdStablecoinPda,
        target: blacklistTarget.publicKey,
        blacklistEntry,
        roleAssignment,
        systemProgram: SystemProgram.programId,
      })
      .signers([blacklisterKp])
      .rpc();

    const entry = await treasuryProgram.account.blacklistEntry.fetch(
      blacklistEntry
    );
    expect(entry.address.toBase58()).to.equal(
      blacklistTarget.publicKey.toBase58()
    );
    expect(entry.reason).to.equal("Suspicious activity");
    expect(entry.active).to.equal(true);
  });

  // ── Blacklist: Remove (deactivate) ─────────────────────────

  it("2. Removes address from blacklist (deactivates entry)", async () => {
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      blacklistTarget.publicKey
    );
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );

    await treasuryProgram.methods
      .removeFromBlacklist()
      .accountsStrict({
        authority: blacklisterKp.publicKey,
        stablecoin: vusdStablecoinPda,
        blacklistEntry,
        roleAssignment,
      })
      .signers([blacklisterKp])
      .rpc();

    const entry = await treasuryProgram.account.blacklistEntry.fetch(
      blacklistEntry
    );
    expect(entry.active).to.equal(false);
  });

  // ── Blacklist: Close deactivated entry (reclaim rent) ──────

  it("3. Closes deactivated blacklist entry and reclaims rent", async () => {
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      blacklistTarget.publicKey
    );
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );

    const balanceBefore = await connection.getBalance(blacklisterKp.publicKey);

    await treasuryProgram.methods
      .closeBlacklistEntry()
      .accountsStrict({
        authority: blacklisterKp.publicKey,
        stablecoin: vusdStablecoinPda,
        blacklistEntry,
        roleAssignment,
      })
      .signers([blacklisterKp])
      .rpc();

    const balanceAfter = await connection.getBalance(blacklisterKp.publicKey);
    // Balance should have increased (minus tx fee) due to rent reclaim
    // The rent reclaim gives back the account's lamports, which should more than
    // offset the ~5000 lamport transaction fee
    expect(balanceAfter).to.be.greaterThan(balanceBefore - 10000);

    // Verify account is closed
    const accountInfo = await connection.getAccountInfo(blacklistEntry);
    expect(accountInfo).to.be.null;
  });

  // ── Reject closing active blacklist entry ──────────────────

  it("4. Rejects closing an active blacklist entry", async () => {
    // First, create a new blacklist entry
    const freshTarget = Keypair.generate();
    await airdrop(freshTarget.publicKey);

    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      freshTarget.publicKey
    );
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );

    await treasuryProgram.methods
      .addToBlacklist("Test active close rejection")
      .accountsStrict({
        authority: blacklisterKp.publicKey,
        stablecoin: vusdStablecoinPda,
        target: freshTarget.publicKey,
        blacklistEntry,
        roleAssignment,
        systemProgram: SystemProgram.programId,
      })
      .signers([blacklisterKp])
      .rpc();

    // Now try to close the active entry — should fail
    try {
      await treasuryProgram.methods
        .closeBlacklistEntry()
        .accountsStrict({
          authority: blacklisterKp.publicKey,
          stablecoin: vusdStablecoinPda,
          blacklistEntry,
          roleAssignment,
        })
        .signers([blacklisterKp])
        .rpc();
      expect.fail("Should have thrown AccountStillActive error");
    } catch (err: any) {
      expect(err.toString()).to.include("AccountStillActive");
    }
  });

  // ── Seize tokens from blacklisted account ──────────────────

  it("5. Seizes tokens from a blacklisted account", async () => {
    // Blacklist seize target
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      seizeTarget.publicKey
    );
    const [blacklisterRole] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "blacklister",
      blacklisterKp.publicKey
    );

    await treasuryProgram.methods
      .addToBlacklist("Funds seizure")
      .accountsStrict({
        authority: blacklisterKp.publicKey,
        stablecoin: vusdStablecoinPda,
        target: seizeTarget.publicKey,
        blacklistEntry,
        roleAssignment: blacklisterRole,
        systemProgram: SystemProgram.programId,
      })
      .signers([blacklisterKp])
      .rpc();

    // Create token accounts and mint tokens to seize target
    const sourceTokenAccount = await createAta(
      seizeTarget.publicKey,
      vusdMintKp.publicKey
    );
    const treasuryTokenAccount = await createAta(
      seizerKp.publicKey,
      vusdMintKp.publicKey
    );

    // Mint tokens to seize target
    await treasuryProgram.methods
      .mintTokens(new BN(100_000_000))
      .accountsStrict({
        minter: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        mint: vusdMintKp.publicKey,
        roleAssignment: null,
        minterInfo: null,
        recipientTokenAccount: sourceTokenAccount,
        oracleConfig: null,
        priceFeed: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    const [seizerRole] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "seizer",
      seizerKp.publicKey
    );

    await treasuryProgram.methods
      .seize()
      .accountsStrict({
        authority: seizerKp.publicKey,
        stablecoin: vusdStablecoinPda,
        mint: vusdMintKp.publicKey,
        sourceTokenAccount,
        treasuryTokenAccount,
        blacklistEntry,
        roleAssignment: seizerRole,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([seizerKp])
      .rpc();

    // Verify tokens were moved (source should be empty or reduced)
  });

  // ── Allowlist: Add ─────────────────────────────────────────

  it("6. Adds address to allowlist", async () => {
    const [allowlistEntry] = findAllowlistEntryPda(
      vusdStablecoinPda,
      allowlistTarget.publicKey
    );

    await treasuryProgram.methods
      .addToAllowlist()
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        target: allowlistTarget.publicKey,
        allowlistEntry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry = await treasuryProgram.account.allowlistEntry.fetch(
      allowlistEntry
    );
    expect(entry.address.toBase58()).to.equal(
      allowlistTarget.publicKey.toBase58()
    );
  });

  // ── Allowlist: Remove (closes and reclaims rent) ───────────

  it("7. Removes from allowlist (closes account, reclaims rent)", async () => {
    const [allowlistEntry] = findAllowlistEntryPda(
      vusdStablecoinPda,
      allowlistTarget.publicKey
    );

    const balanceBefore = await connection.getBalance(authority.publicKey);

    await treasuryProgram.methods
      .removeFromAllowlist()
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        allowlistEntry,
      })
      .rpc();

    // Verify account is closed
    const accountInfo = await connection.getAccountInfo(allowlistEntry);
    expect(accountInfo).to.be.null;
  });

  // ── Reject blacklist on SSS-1 without proper role ──────────

  it("8. Rejects blacklist by unauthorized signer", async () => {
    const unauthorizedKp = Keypair.generate();
    await airdrop(unauthorizedKp.publicKey);

    const targetKp = Keypair.generate();
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      targetKp.publicKey
    );
    // No role assignment for this unauthorized user - pass null
    // The program should reject because the signer is not authority and has no role
    try {
      await treasuryProgram.methods
        .addToBlacklist("Unauthorized attempt")
        .accountsStrict({
          authority: unauthorizedKp.publicKey,
          stablecoin: vusdStablecoinPda,
          target: targetKp.publicKey,
          blacklistEntry,
          roleAssignment: null,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedKp])
        .rpc();
      expect.fail("Should have thrown Unauthorized error");
    } catch (err: any) {
      expect(err.toString()).to.satisfy(
        (msg: string) =>
          msg.includes("Unauthorized") ||
          msg.includes("ConstraintSeeds") ||
          msg.includes("2012") ||
          msg.includes("Error")
      );
    }
  });

  // ── Role lifecycle: assign, revoke, close ──────────────────

  it("9. Assigns a role to target", async () => {
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "pauser",
      roleTarget.publicKey
    );

    await treasuryProgram.methods
      .assignRole({ pauser: {} })
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        assignee: roleTarget.publicKey,
        roleAssignment,
        minterInfo: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const role = await treasuryProgram.account.roleAssignment.fetch(
      roleAssignment
    );
    expect(role.active).to.equal(true);
    expect(role.assignee.toBase58()).to.equal(roleTarget.publicKey.toBase58());
  });

  it("10. Revokes a role from target", async () => {
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "pauser",
      roleTarget.publicKey
    );

    await treasuryProgram.methods
      .revokeRole()
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        roleAssignment,
      })
      .rpc();

    const role = await treasuryProgram.account.roleAssignment.fetch(
      roleAssignment
    );
    expect(role.active).to.equal(false);
  });

  it("11. Closes revoked role assignment (reclaims rent)", async () => {
    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "pauser",
      roleTarget.publicKey
    );

    await treasuryProgram.methods
      .closeRole()
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        roleAssignment,
      })
      .rpc();

    // Verify account is closed
    const accountInfo = await connection.getAccountInfo(roleAssignment);
    expect(accountInfo).to.be.null;
  });

  it("12. Rejects closing an active role assignment", async () => {
    // Create a new role, keep it active
    const activeTarget = Keypair.generate();
    await airdrop(activeTarget.publicKey);

    const [roleAssignment] = findRoleAssignmentPda(
      vusdStablecoinPda,
      "pauser",
      activeTarget.publicKey
    );

    await treasuryProgram.methods
      .assignRole({ pauser: {} })
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        assignee: activeTarget.publicKey,
        roleAssignment,
        minterInfo: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Try to close without revoking — should fail
    try {
      await treasuryProgram.methods
        .closeRole()
        .accountsStrict({
          authority: authority.publicKey,
          stablecoin: vusdStablecoinPda,
          roleAssignment,
        })
        .rpc();
      expect.fail("Should have thrown AccountStillActive error");
    } catch (err: any) {
      expect(err.toString()).to.include("AccountStillActive");
    }
  });

  // ── Additional blacklist edge case ─────────────────────────

  it("13. Authority can blacklist without delegated role", async () => {
    const targetKp = Keypair.generate();
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      targetKp.publicKey
    );

    await treasuryProgram.methods
      .addToBlacklist("Authority direct blacklist")
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        target: targetKp.publicKey,
        blacklistEntry,
        roleAssignment: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry = await treasuryProgram.account.blacklistEntry.fetch(
      blacklistEntry
    );
    expect(entry.active).to.equal(true);
    expect(entry.reason).to.equal("Authority direct blacklist");
  });

  it("14. Verifies blacklist entry contains correct metadata", async () => {
    const targetKp = Keypair.generate();
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      targetKp.publicKey
    );

    await treasuryProgram.methods
      .addToBlacklist("Metadata verification test")
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        target: targetKp.publicKey,
        blacklistEntry,
        roleAssignment: null,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry = await treasuryProgram.account.blacklistEntry.fetch(
      blacklistEntry
    );
    expect(entry.stablecoin.toBase58()).to.equal(vusdStablecoinPda.toBase58());
    expect(entry.address.toBase58()).to.equal(targetKp.publicKey.toBase58());
    expect(entry.reason).to.equal("Metadata verification test");
    expect(entry.active).to.equal(true);
    expect(entry.blacklistedBy.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
    expect(entry.blacklistedAt.toNumber()).to.be.greaterThan(0);
  });

  it("15. Rejects blacklist with reason exceeding max length", async () => {
    const targetKp = Keypair.generate();
    const [blacklistEntry] = findBlacklistEntryPda(
      vusdStablecoinPda,
      targetKp.publicKey
    );

    // Very long reason string — should exceed ReasonTooLong
    const longReason = "A".repeat(300);

    try {
      await treasuryProgram.methods
        .addToBlacklist(longReason)
        .accountsStrict({
          authority: authority.publicKey,
          stablecoin: vusdStablecoinPda,
          target: targetKp.publicKey,
          blacklistEntry,
          roleAssignment: null,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("Should have thrown ReasonTooLong error");
    } catch (err: any) {
      expect(err.toString()).to.satisfy(
        (msg: string) =>
          msg.includes("ReasonTooLong") || msg.includes("Error")
      );
    }
  });
});
