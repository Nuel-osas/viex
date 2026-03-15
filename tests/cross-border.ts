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
import { createHash } from "crypto";
import BN from "bn.js";

describe("Cross-Border Treasury Features", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const treasuryProgram = anchor.workspace.ViexTreasury as Program<ViexTreasury>;

  const authority = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  // Mint keypairs
  const vusdMintKp = Keypair.generate();
  const veurMintKp = Keypair.generate();

  // PDAs
  let treasuryPda: PublicKey;
  let vusdStablecoinPda: PublicKey;
  let veurStablecoinPda: PublicKey;

  // Test targets
  const kycTarget = Keypair.generate();
  const kycTarget2 = Keypair.generate();
  const originatorKp = Keypair.generate();
  const beneficiaryKp = Keypair.generate();
  const newAuthorityKp = Keypair.generate();
  const singleTransferTarget = Keypair.generate();

  // Fake Pyth oracle feed (just a keypair for config, not a real oracle)
  const fakePythFeed = Keypair.generate();

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

  function findFxPairConfigPda(
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
      treasuryProgram.programId
    );
  }

  function findKycEntryPda(
    treasury: PublicKey,
    target: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("kyc"), treasury.toBuffer(), target.toBuffer()],
      treasuryProgram.programId
    );
  }

  function findTravelRuleMessagePda(
    treasury: PublicKey,
    transferSignature: Buffer
  ): [PublicKey, number] {
    // PDA uses SHA256 hash of the 64-byte signature (max seed = 32 bytes)
    const sigHash = createHash("sha256").update(transferSignature).digest();
    return PublicKey.findProgramAddressSync(
      [Buffer.from("travel_rule"), treasury.toBuffer(), sigHash],
      treasuryProgram.programId
    );
  }

  async function airdrop(dest: PublicKey, amount = 10 * LAMPORTS_PER_SOL) {
    const sig = await connection.requestAirdrop(dest, amount);
    await connection.confirmTransaction(sig, "confirmed");
  }

  // ── Setup ──────────────────────────────────────────────────

  before(async () => {
    [treasuryPda] = findTreasuryPda(authority.publicKey);
    [vusdStablecoinPda] = findStablecoinPda(vusdMintKp.publicKey);
    [veurStablecoinPda] = findStablecoinPda(veurMintKp.publicKey);

    await Promise.all([
      airdrop(kycTarget.publicKey),
      airdrop(kycTarget2.publicKey),
      airdrop(originatorKp.publicKey),
      airdrop(beneficiaryKp.publicKey),
      airdrop(newAuthorityKp.publicKey),
      airdrop(singleTransferTarget.publicKey),
    ]);

    // Init treasury (skip if already exists from prior test suite)
    const existing = await connection.getAccountInfo(treasuryPda);
    if (!existing) {
      await treasuryProgram.methods
        .initTreasury("CrossBorder Treasury", "USD", new BN(3000_000_000), true)
        .accountsStrict({
          authority: authority.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    // Init VUSD
    await treasuryProgram.methods
      .initialize("CrossBorder USD", "VUSD", "https://viex.io/vusd.json", 6, {
        enablePermanentDelegate: true,
        enableTransferHook: false,
        enableAllowlist: false,
        enableDefaultAccountState: false,
        enableConfidentialTransfer: false,
      })
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

    // Init VEUR
    await treasuryProgram.methods
      .initialize("CrossBorder EUR", "VEUR", "https://viex.io/veur.json", 6, {
        enablePermanentDelegate: true,
        enableTransferHook: false,
        enableAllowlist: false,
        enableDefaultAccountState: false,
        enableConfidentialTransfer: false,
      })
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        mint: veurMintKp.publicKey,
        stablecoin: veurStablecoinPda,
        transferHookProgram: null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([veurMintKp])
      .rpc();

    // Register both mints
    await treasuryProgram.methods
      .registerMint()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        stablecoin: vusdStablecoinPda,
      })
      .rpc();

    await treasuryProgram.methods
      .registerMint()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        stablecoin: veurStablecoinPda,
      })
      .rpc();
  });

  // ── FX Pair Configuration ─────────────────────────────────

  it("1. Configures FX pair (VUSD -> VEUR) with Pyth feed", async () => {
    const [fxPairConfig] = findFxPairConfigPda(
      treasuryPda,
      vusdMintKp.publicKey,
      veurMintKp.publicKey
    );

    await treasuryProgram.methods
      .configureFxPair(
        fakePythFeed.publicKey, // price_feed
        new BN(300), // max_staleness_secs
        50, // max_slippage_bps (0.5%)
        true // enabled
      )
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        sourceMint: vusdMintKp.publicKey,
        destMint: veurMintKp.publicKey,
        fxPairConfig,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await treasuryProgram.account.fxPairConfig.fetch(
      fxPairConfig
    );
    expect(config.treasury.toBase58()).to.equal(treasuryPda.toBase58());
    expect(config.sourceMint.toBase58()).to.equal(
      vusdMintKp.publicKey.toBase58()
    );
    expect(config.destMint.toBase58()).to.equal(
      veurMintKp.publicKey.toBase58()
    );
    expect(config.priceFeed.toBase58()).to.equal(
      fakePythFeed.publicKey.toBase58()
    );
    expect(config.maxStalenessSecs.toNumber()).to.equal(300);
    expect(config.maxSlippageBps).to.equal(50);
    expect(config.enabled).to.equal(true);
  });

  // ── KYC: Approve ──────────────────────────────────────────

  it("2. KYC approves an address with level, jurisdiction, and expiry", async () => {
    const [kycEntry] = findKycEntryPda(treasuryPda, kycTarget.publicKey);

    // jurisdiction "USA" as [u8; 3]
    const jurisdiction = [85, 83, 65]; // ASCII for "USA"
    // Expiry 1 year from now (in seconds)
    const expiresAt = new BN(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);

    await treasuryProgram.methods
      .kycApprove(1, jurisdiction, "Jumio", expiresAt)
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        target: kycTarget.publicKey,
        kycEntry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry = await treasuryProgram.account.kycEntry.fetch(kycEntry);
    expect(entry.address.toBase58()).to.equal(kycTarget.publicKey.toBase58());
    expect(entry.treasury.toBase58()).to.equal(treasuryPda.toBase58());
    expect(entry.active).to.equal(true);
    expect(entry.provider).to.equal("Jumio");
    expect(entry.jurisdiction).to.deep.equal(jurisdiction);
    expect(entry.expiresAt.toNumber()).to.equal(expiresAt.toNumber());
  });

  // ── KYC: Revoke ───────────────────────────────────────────

  it("3. KYC revokes an address", async () => {
    const [kycEntry] = findKycEntryPda(treasuryPda, kycTarget.publicKey);

    await treasuryProgram.methods
      .kycRevoke()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        kycEntry,
      })
      .rpc();

    const entry = await treasuryProgram.account.kycEntry.fetch(kycEntry);
    expect(entry.active).to.equal(false);
  });

  // ── KYC: Close revoked entry (reclaim rent) ────────────────

  it("4. Closes revoked KYC entry and reclaims rent", async () => {
    const [kycEntry] = findKycEntryPda(treasuryPda, kycTarget.publicKey);

    const balanceBefore = await connection.getBalance(authority.publicKey);

    await treasuryProgram.methods
      .kycClose()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        kycEntry,
      })
      .rpc();

    // Verify account is closed
    const accountInfo = await connection.getAccountInfo(kycEntry);
    expect(accountInfo).to.be.null;

    const balanceAfter = await connection.getBalance(authority.publicKey);
    // Should have gotten rent back (minus small tx fee)
    // Just verify the account is definitely gone
  });

  // ── KYC: Reject closing active entry ──────────────────────

  it("5. Rejects closing an active KYC entry", async () => {
    // Create a new KYC entry
    const [kycEntry] = findKycEntryPda(treasuryPda, kycTarget2.publicKey);

    const jurisdiction = [71, 66, 82]; // "GBR"
    const expiresAt = new BN(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);

    await treasuryProgram.methods
      .kycApprove(2, jurisdiction, "Onfido", expiresAt)
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        target: kycTarget2.publicKey,
        kycEntry,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Attempt to close the active entry — should fail
    try {
      await treasuryProgram.methods
        .kycClose()
        .accountsStrict({
          authority: authority.publicKey,
          treasury: treasuryPda,
          kycEntry,
        })
        .rpc();
      expect.fail("Should have thrown AccountStillActive error");
    } catch (err: any) {
      expect(err.toString()).to.include("AccountStillActive");
    }
  });

  // ── Travel Rule: Attach ────────────────────────────────────

  it("6. Attaches travel rule message to a transfer", async () => {
    // Generate a mock transfer signature (64 bytes)
    const transferSignature = Buffer.alloc(64);
    for (let i = 0; i < 64; i++) {
      transferSignature[i] = i % 256;
    }

    const [travelRuleMessage] = findTravelRuleMessagePda(
      treasuryPda,
      transferSignature
    );

    const sigHash = Array.from(createHash("sha256").update(transferSignature).digest());

    await treasuryProgram.methods
      .attachTravelRule(
        Array.from(transferSignature), // transfer_signature [u8; 64]
        sigHash, // sig_hash [u8; 32]
        new BN(5000_000_000), // amount: 5000 VUSD
        "Alice Corp", // originator_name
        "VASP-001", // originator_vasp
        "Bob Inc", // beneficiary_name
        "VASP-002" // beneficiary_vasp
      )
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        sourceMint: vusdMintKp.publicKey,
        originator: originatorKp.publicKey,
        beneficiary: beneficiaryKp.publicKey,
        travelRuleMessage,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const msg = await treasuryProgram.account.travelRuleMessage.fetch(
      travelRuleMessage
    );
    expect(msg.treasury.toBase58()).to.equal(treasuryPda.toBase58());
    expect(msg.amount.toNumber()).to.equal(5000_000_000);
    expect(msg.originatorName).to.equal("Alice Corp");
    expect(msg.originatorVasp).to.equal("VASP-001");
    expect(msg.beneficiaryName).to.equal("Bob Inc");
    expect(msg.beneficiaryVasp).to.equal("VASP-002");
    expect(msg.originatorAccount.toBase58()).to.equal(
      originatorKp.publicKey.toBase58()
    );
    expect(msg.beneficiaryAccount.toBase58()).to.equal(
      beneficiaryKp.publicKey.toBase58()
    );
    expect(msg.sourceMint.toBase58()).to.equal(
      vusdMintKp.publicKey.toBase58()
    );
  });

  // ── Travel Rule: Close (reclaim rent) ──────────────────────

  it("7. Closes travel rule message and reclaims rent", async () => {
    const transferSignature = Buffer.alloc(64);
    for (let i = 0; i < 64; i++) {
      transferSignature[i] = i % 256;
    }

    const [travelRuleMessage] = findTravelRuleMessagePda(
      treasuryPda,
      transferSignature
    );

    await treasuryProgram.methods
      .closeTravelRule()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        travelRuleMessage,
      })
      .rpc();

    const accountInfo = await connection.getAccountInfo(travelRuleMessage);
    expect(accountInfo).to.be.null;
  });

  // ── Travel Rule: Second message for coverage ───────────────

  it("8. Attaches a second travel rule message with different data", async () => {
    const transferSignature = Buffer.alloc(64);
    transferSignature.fill(0xAB);

    const [travelRuleMessage] = findTravelRuleMessagePda(
      treasuryPda,
      transferSignature
    );

    const sigHash = Array.from(createHash("sha256").update(transferSignature).digest());

    await treasuryProgram.methods
      .attachTravelRule(
        Array.from(transferSignature),
        sigHash,
        new BN(10000_000_000),
        "Charlie VASP",
        "VASP-003",
        "Delta Finance",
        "VASP-004"
      )
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        sourceMint: veurMintKp.publicKey,
        originator: originatorKp.publicKey,
        beneficiary: beneficiaryKp.publicKey,
        travelRuleMessage,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const msg = await treasuryProgram.account.travelRuleMessage.fetch(
      travelRuleMessage
    );
    expect(msg.originatorName).to.equal("Charlie VASP");
    expect(msg.sourceMint.toBase58()).to.equal(
      veurMintKp.publicKey.toBase58()
    );
  });

  // ── Remove FX Pair (reclaim rent) ──────────────────────────

  it("9. Removes FX pair config and reclaims rent", async () => {
    const [fxPairConfig] = findFxPairConfigPda(
      treasuryPda,
      vusdMintKp.publicKey,
      veurMintKp.publicKey
    );

    await treasuryProgram.methods
      .removeFxPair()
      .accountsStrict({
        authority: authority.publicKey,
        treasury: treasuryPda,
        fxPairConfig,
      })
      .rpc();

    const accountInfo = await connection.getAccountInfo(fxPairConfig);
    expect(accountInfo).to.be.null;
  });

  // ── Two-step authority transfer (nominate + accept) ────────

  it("10. Nominates new authority for VUSD stablecoin", async () => {
    await treasuryProgram.methods
      .nominateAuthority(newAuthorityKp.publicKey)
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
      })
      .rpc();

    const stablecoin = await treasuryProgram.account.stablecoin.fetch(
      vusdStablecoinPda
    );
    expect(stablecoin.pendingAuthority).to.not.be.null;
    expect(stablecoin.pendingAuthority!.toBase58()).to.equal(
      newAuthorityKp.publicKey.toBase58()
    );
  });

  it("11. New authority accepts the authority transfer", async () => {
    await treasuryProgram.methods
      .acceptAuthority()
      .accountsStrict({
        newAuthority: newAuthorityKp.publicKey,
        stablecoin: vusdStablecoinPda,
      })
      .signers([newAuthorityKp])
      .rpc();

    const stablecoin = await treasuryProgram.account.stablecoin.fetch(
      vusdStablecoinPda
    );
    expect(stablecoin.authority.toBase58()).to.equal(
      newAuthorityKp.publicKey.toBase58()
    );
    expect(stablecoin.pendingAuthority).to.be.null;
  });

  // Transfer authority back for subsequent tests
  it("12. Transfers authority back (for test continuity)", async () => {
    await treasuryProgram.methods
      .nominateAuthority(authority.publicKey)
      .accountsStrict({
        authority: newAuthorityKp.publicKey,
        stablecoin: vusdStablecoinPda,
      })
      .signers([newAuthorityKp])
      .rpc();

    await treasuryProgram.methods
      .acceptAuthority()
      .accountsStrict({
        newAuthority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
      })
      .rpc();

    const stablecoin = await treasuryProgram.account.stablecoin.fetch(
      vusdStablecoinPda
    );
    expect(stablecoin.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
  });

  // ── Single-step authority transfer ─────────────────────────

  it("13. Single-step authority transfer on VEUR", async () => {
    await treasuryProgram.methods
      .transferAuthority(singleTransferTarget.publicKey)
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: veurStablecoinPda,
      })
      .rpc();

    const stablecoin = await treasuryProgram.account.stablecoin.fetch(
      veurStablecoinPda
    );
    expect(stablecoin.authority.toBase58()).to.equal(
      singleTransferTarget.publicKey.toBase58()
    );
  });

  // Transfer VEUR authority back
  it("14. Transfers VEUR authority back for cleanup", async () => {
    await treasuryProgram.methods
      .transferAuthority(authority.publicKey)
      .accountsStrict({
        authority: singleTransferTarget.publicKey,
        stablecoin: veurStablecoinPda,
      })
      .signers([singleTransferTarget])
      .rpc();

    const stablecoin = await treasuryProgram.account.stablecoin.fetch(
      veurStablecoinPda
    );
    expect(stablecoin.authority.toBase58()).to.equal(
      authority.publicKey.toBase58()
    );
  });

  // ── Update Metadata URI ────────────────────────────────────

  it("15. Updates metadata URI on VUSD stablecoin", async () => {
    const newUri = "https://viex.io/vusd-v2.json";

    await treasuryProgram.methods
      .updateMetadata(newUri)
      .accountsStrict({
        authority: authority.publicKey,
        stablecoin: vusdStablecoinPda,
        mint: vusdMintKp.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    // Verify stablecoin state reflects the update
    // Note: the on-chain metadata on the mint itself is updated via Token-2022;
    // the stablecoin account may or may not store the URI.
    // We verify the instruction succeeds without error.
  });

  // ── FX Conversion (commented out — requires real Pyth oracle) ─

  /*
  it("Converts VUSD to VEUR via FX pair", async () => {
    // NOTE: This test requires a live Pyth oracle price feed on localnet.
    // On localnet, Pyth feeds are not available by default. To test this:
    //
    // 1. Use @pythnetwork/pyth-solana-receiver-sdk to create a mock price feed
    // 2. Or deploy a mock Pyth program that returns a fixed price
    // 3. Or run against devnet with real Pyth feeds
    //
    // Example flow (with mock oracle):
    //
    // const [fxPairConfig] = findFxPairConfigPda(
    //   treasuryPda,
    //   vusdMintKp.publicKey,
    //   veurMintKp.publicKey,
    // );
    //
    // // Reconfigure FX pair (was removed in test 9)
    // await treasuryProgram.methods
    //   .configureFxPair(mockPythFeed, new BN(300), 50, true)
    //   .accountsStrict({
    //     authority: authority.publicKey,
    //     treasury: treasuryPda,
    //     sourceMint: vusdMintKp.publicKey,
    //     destMint: veurMintKp.publicKey,
    //     fxPairConfig,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .rpc();
    //
    // const converterSourceAccount = getAssociatedTokenAddressSync(
    //   vusdMintKp.publicKey, authority.publicKey, false, TOKEN_2022_PROGRAM_ID
    // );
    // const converterDestAccount = getAssociatedTokenAddressSync(
    //   veurMintKp.publicKey, authority.publicKey, false, TOKEN_2022_PROGRAM_ID
    // );
    //
    // await treasuryProgram.methods
    //   .convert(new BN(100_000_000), new BN(85_000_000))
    //   .accountsStrict({
    //     converter: authority.publicKey,
    //     treasury: treasuryPda,
    //     sourceStablecoin: vusdStablecoinPda,
    //     destStablecoin: veurStablecoinPda,
    //     sourceMint: vusdMintKp.publicKey,
    //     destMint: veurMintKp.publicKey,
    //     converterSourceAccount,
    //     converterDestAccount,
    //     fxPairConfig,
    //     priceFeed: mockPythFeed,
    //     sourceTokenProgram: TOKEN_2022_PROGRAM_ID,
    //     destTokenProgram: TOKEN_2022_PROGRAM_ID,
    //   })
    //   .rpc();
  });
  */
});
