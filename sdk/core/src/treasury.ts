import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AnchorProvider,
  Program,
  Wallet,
  BN,
} from "@coral-xyz/anchor";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  findTreasuryPDA,
  findStablecoinPDA,
  findRolePDA,
  findMinterInfoPDA,
  findBlacklistPDA,
  findAllowlistPDA,
  findKycPDA,
  findTravelRulePDA,
  findFxPairPDA,
  findOracleConfigPDA,
} from "./pda";

import {
  VIEX_TREASURY_PROGRAM_ID,
  VIEX_TRANSFER_HOOK_PROGRAM_ID,
  Role,
  roleToAnchor,
  roleToSeedString,
  type StablecoinInitConfig,
  type TreasuryAccount,
  type StablecoinAccount,
  type CreateTreasuryOpts,
  Presets,
} from "./types";

import { ComplianceModule } from "./compliance";
import { KycModule } from "./kyc";
import { TravelRuleModule } from "./travel-rule";

// Re-export the IDL type for consumers who load their own IDL
import type { ViexTreasury as ViexTreasuryIDL } from "../../../target/types/viex_treasury";

/**
 * ViexTreasury — Main SDK class for interacting with the VIEX Treasury program.
 *
 * Use the factory methods `createTreasury()` or `load()` to obtain an instance.
 */
export class ViexTreasury {
  private readonly _compliance: ComplianceModule;
  private readonly _kyc: KycModule;
  private readonly _travelRule: TravelRuleModule;

  private constructor(
    readonly program: Program<any>,
    readonly connection: Connection,
    readonly treasuryAddress: PublicKey,
    readonly authority: PublicKey
  ) {
    this._compliance = new ComplianceModule(program, authority, treasuryAddress);
    this._kyc = new KycModule(program, authority, treasuryAddress);
    this._travelRule = new TravelRuleModule(program, authority, treasuryAddress);
  }

  // ── Sub-modules ─────────────────────────────────────────────────────────

  get compliance(): ComplianceModule {
    return this._compliance;
  }

  get kyc(): KycModule {
    return this._kyc;
  }

  get travelRule(): TravelRuleModule {
    return this._travelRule;
  }

  // ── Factory methods ─────────────────────────────────────────────────────

  /**
   * Create a new treasury and return a ViexTreasury instance.
   *
   * @param connection    - Solana RPC connection.
   * @param authority     - The wallet/keypair that will own the treasury.
   * @param name          - Display name for the treasury.
   * @param baseCurrency  - Base currency code (e.g. "USD").
   * @param opts          - Optional overrides for travelRuleThreshold, kycRequired, programId.
   */
  static async createTreasury(
    connection: Connection,
    authority: PublicKey,
    name: string,
    baseCurrency: string,
    opts?: CreateTreasuryOpts
  ): Promise<{ treasury: ViexTreasury; txSig: string }> {
    const programId = opts?.programId ?? VIEX_TREASURY_PROGRAM_ID;
    const program = ViexTreasury.getProgram(connection, authority, programId);

    const [treasuryAddress] = findTreasuryPDA(authority, programId);

    const travelRuleThreshold = opts?.travelRuleThreshold ?? new BN(3000_000_000); // 3000 units default
    const kycRequired = opts?.kycRequired ?? false;

    const txSig = await program.methods
      .initTreasury(name, baseCurrency, travelRuleThreshold, kycRequired)
      .accountsPartial({
        authority,
        treasury: treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const instance = new ViexTreasury(
      program,
      connection,
      treasuryAddress,
      authority
    );
    return { treasury: instance, txSig };
  }

  /**
   * Load an existing treasury by its PDA address.
   */
  static async load(
    connection: Connection,
    treasuryAddress: PublicKey,
    authority: PublicKey,
    programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
  ): Promise<ViexTreasury> {
    const program = ViexTreasury.getProgram(connection, authority, programId);

    // Verify the treasury account exists
    await program.account.treasury.fetch(treasuryAddress);

    return new ViexTreasury(program, connection, treasuryAddress, authority);
  }

  /**
   * Load a treasury by authority public key (derives the PDA automatically).
   */
  static async fromAuthority(
    connection: Connection,
    authority: PublicKey,
    programId: PublicKey = VIEX_TREASURY_PROGRAM_ID
  ): Promise<ViexTreasury> {
    const [treasuryAddress] = findTreasuryPDA(authority, programId);
    return ViexTreasury.load(connection, treasuryAddress, authority, programId);
  }

  // ── Treasury data ─────────────────────────────────────────────────────

  /**
   * Fetch the on-chain Treasury account data.
   */
  async fetchTreasury(): Promise<TreasuryAccount> {
    return (await this.program.account.treasury.fetch(
      this.treasuryAddress
    )) as unknown as TreasuryAccount;
  }

  /**
   * Fetch a Stablecoin account by its mint address.
   */
  async fetchStablecoin(mint: PublicKey): Promise<StablecoinAccount> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    return (await this.program.account.stablecoin.fetch(
      stablecoin
    )) as unknown as StablecoinAccount;
  }

  // ── Stablecoin initialization ─────────────────────────────────────────

  /**
   * Initialize a new stablecoin under this treasury.
   *
   * @param name                - Display name (e.g. "VIEX USD").
   * @param symbol              - Token symbol (e.g. "vUSD").
   * @param uri                 - Metadata URI.
   * @param decimals            - Token decimals (typically 6 or 9).
   * @param config              - Feature configuration. Use Presets for convenience.
   * @param transferHookProgram - Optional transfer hook program ID.
   * @returns The new mint keypair and transaction signature.
   */
  async initStablecoin(
    name: string,
    symbol: string,
    uri: string,
    decimals: number,
    config: StablecoinInitConfig,
    transferHookProgram?: PublicKey
  ): Promise<{ mint: Keypair; txSig: string }> {
    const mintKeypair = Keypair.generate();
    const [stablecoin] = findStablecoinPDA(
      mintKeypair.publicKey,
      this.program.programId
    );

    const txSig = await this.program.methods
      .initialize(name, symbol, uri, decimals, config)
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        mint: mintKeypair.publicKey,
        stablecoin,
        transferHookProgram: transferHookProgram ?? null,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKeypair])
      .rpc();

    return { mint: mintKeypair, txSig };
  }

  /**
   * Register an already-initialized stablecoin's mint with this treasury.
   */
  async registerMint(stablecoinAddress: PublicKey): Promise<string> {
    return this.program.methods
      .registerMint()
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        stablecoin: stablecoinAddress,
      })
      .rpc();
  }

  // ── Stablecoin operations ─────────────────────────────────────────────

  /**
   * Mint tokens to a recipient.
   */
  async mint(
    mint: PublicKey,
    recipient: PublicKey,
    amount: BN | number
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "minter",
      this.authority,
      this.program.programId
    );
    const [minterInfo] = findMinterInfoPDA(
      stablecoin,
      this.authority,
      this.program.programId
    );
    const [oracleConfig] = findOracleConfigPDA(
      stablecoin,
      this.program.programId
    );

    const recipientAta = getAssociatedTokenAddressSync(
      mint,
      recipient,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;

    // Try to include oracle accounts if oracle is configured
    let oracleConfigAccount: PublicKey | null = null;
    let priceFeedAccount: PublicKey | null = null;
    try {
      const oracleData = await this.program.account.oracleConfig.fetch(oracleConfig);
      oracleConfigAccount = oracleConfig;
      priceFeedAccount = (oracleData as any).priceFeed;
    } catch {
      // Oracle not configured — pass null
    }

    return this.program.methods
      .mintTokens(amountBn)
      .accountsPartial({
        minter: this.authority,
        stablecoin,
        mint,
        roleAssignment,
        minterInfo,
        recipientTokenAccount: recipientAta,
        oracleConfig: oracleConfigAccount,
        priceFeed: priceFeedAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Burn tokens from the authority's token account.
   */
  async burn(mint: PublicKey, amount: BN | number): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "burner",
      this.authority,
      this.program.programId
    );

    const burnerAta = getAssociatedTokenAddressSync(
      mint,
      this.authority,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const [oracleConfig] = findOracleConfigPDA(
      stablecoin,
      this.program.programId
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;

    let oracleConfigAccount: PublicKey | null = null;
    let priceFeedAccount: PublicKey | null = null;
    try {
      const oracleData = await this.program.account.oracleConfig.fetch(oracleConfig);
      oracleConfigAccount = oracleConfig;
      priceFeedAccount = (oracleData as any).priceFeed;
    } catch {
      // Oracle not configured
    }

    return this.program.methods
      .burnTokens(amountBn)
      .accountsPartial({
        burner: this.authority,
        stablecoin,
        mint,
        roleAssignment,
        burnerTokenAccount: burnerAta,
        oracleConfig: oracleConfigAccount,
        priceFeed: priceFeedAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Freeze a specific token account.
   */
  async freeze(mint: PublicKey, tokenAccount: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "pauser",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .freezeAccount()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        tokenAccount,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Thaw (unfreeze) a specific token account.
   */
  async thaw(mint: PublicKey, tokenAccount: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "pauser",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .thawAccount()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        tokenAccount,
        roleAssignment,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  /**
   * Pause all operations on a stablecoin.
   */
  async pause(mint: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "pauser",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .pause()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Unpause a stablecoin.
   */
  async unpause(mint: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      "pauser",
      this.authority,
      this.program.programId
    );

    return this.program.methods
      .unpause()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Transfer tokens to another address. For Token-2022 mints with transfer hooks,
   * the SDK resolves extra accounts automatically via the hook program.
   */
  async transfer(
    mint: PublicKey,
    to: PublicKey,
    amount: BN | number
  ): Promise<string> {
    const fromAta = getAssociatedTokenAddressSync(
      mint,
      this.authority,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const toAta = getAssociatedTokenAddressSync(
      mint,
      to,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;

    // Use @solana/spl-token transferChecked with Token-2022 for hook resolution.
    // For simple transfers without hooks, this also works.
    const { createTransferCheckedInstruction } = await import("@solana/spl-token");

    const stablecoinData = await this.fetchStablecoin(mint);

    const ix = createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta,
      this.authority,
      BigInt(amountBn.toString()),
      stablecoinData.decimals,
      [],
      TOKEN_2022_PROGRAM_ID
    );

    // If transfer hook is enabled, add the extra accounts
    if (stablecoinData.enableTransferHook) {
      try {
        const { addExtraAccountMetasForExecute } = await import("@solana/spl-token");
        await addExtraAccountMetasForExecute(
          this.connection,
          ix,
          VIEX_TRANSFER_HOOK_PROGRAM_ID,
          fromAta,
          mint,
          toAta,
          this.authority,
          BigInt(amountBn.toString()),
        );
      } catch {
        // If hook resolution fails, proceed without — the on-chain program will validate
      }
    }

    const tx = new (await import("@solana/web3.js")).Transaction().add(ix);
    const provider = this.program.provider as AnchorProvider;
    return provider.sendAndConfirm(tx);
  }

  // ── Role management ───────────────────────────────────────────────────

  /**
   * Assign a role to an address for a specific stablecoin.
   */
  async assignRole(
    mint: PublicKey,
    role: Role,
    assignee: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const roleStr = roleToSeedString(role);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      roleStr,
      assignee,
      this.program.programId
    );

    // MinterInfo PDA is created when assigning the Minter role
    let minterInfo: PublicKey | null = null;
    if (role === Role.Minter) {
      [minterInfo] = findMinterInfoPDA(
        stablecoin,
        assignee,
        this.program.programId
      );
    }

    return this.program.methods
      .assignRole(roleToAnchor(role))
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        assignee,
        roleAssignment,
        minterInfo,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Revoke a role from an address (deactivates, keeps account open).
   */
  async revokeRole(
    mint: PublicKey,
    role: Role,
    assignee: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const roleStr = roleToSeedString(role);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      roleStr,
      assignee,
      this.program.programId
    );

    return this.program.methods
      .revokeRole()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Close a deactivated role assignment to reclaim rent.
   */
  async closeRole(
    mint: PublicKey,
    role: Role,
    assignee: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const roleStr = roleToSeedString(role);
    const [roleAssignment] = findRolePDA(
      stablecoin,
      roleStr,
      assignee,
      this.program.programId
    );

    return this.program.methods
      .closeRole()
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        roleAssignment,
      })
      .rpc();
  }

  /**
   * Set the supply cap for a stablecoin. Pass 0 to remove the cap.
   */
  async setSupplyCap(mint: PublicKey, cap: BN | number): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const capBn = typeof cap === "number" ? new BN(cap) : cap;

    return this.program.methods
      .setSupplyCap(capBn)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
      })
      .rpc();
  }

  /**
   * Update a minter's quota.
   */
  async updateMinterQuota(
    mint: PublicKey,
    minter: PublicKey,
    quota: BN | number
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [minterInfo] = findMinterInfoPDA(
      stablecoin,
      minter,
      this.program.programId
    );

    const quotaBn = typeof quota === "number" ? new BN(quota) : quota;

    return this.program.methods
      .updateMinterQuota(quotaBn)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        minterInfo,
      })
      .rpc();
  }

  // ── Authority management ──────────────────────────────────────────────

  /**
   * Nominate a new authority for a stablecoin (2-step transfer).
   */
  async nominateAuthority(
    mint: PublicKey,
    newAuthority: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);

    return this.program.methods
      .nominateAuthority(newAuthority)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
      })
      .rpc();
  }

  /**
   * Accept a pending authority nomination. Must be called by the nominated authority.
   */
  async acceptAuthority(mint: PublicKey): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);

    return this.program.methods
      .acceptAuthority()
      .accountsPartial({
        newAuthority: this.authority,
        stablecoin,
      })
      .rpc();
  }

  /**
   * Direct authority transfer (single-step, no acceptance required).
   */
  async transferAuthority(
    mint: PublicKey,
    newAuthority: PublicKey
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);

    return this.program.methods
      .transferAuthority(newAuthority)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
      })
      .rpc();
  }

  // ── Metadata ──────────────────────────────────────────────────────────

  /**
   * Update the metadata URI of a stablecoin.
   */
  async updateMetadata(mint: PublicKey, uri: string): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);

    return this.program.methods
      .updateMetadata(uri)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        mint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  // ── Oracle ────────────────────────────────────────────────────────────

  /**
   * Configure or update the oracle for a stablecoin.
   */
  async configureOracle(
    mint: PublicKey,
    priceFeed: PublicKey,
    maxDeviationBps: number,
    maxStalenessSecs: BN | number
  ): Promise<string> {
    const [stablecoin] = findStablecoinPDA(mint, this.program.programId);
    const [oracleConfig] = findOracleConfigPDA(
      stablecoin,
      this.program.programId
    );

    const stalenessBn =
      typeof maxStalenessSecs === "number"
        ? new BN(maxStalenessSecs)
        : maxStalenessSecs;

    return this.program.methods
      .configureOracle(priceFeed, maxDeviationBps, stalenessBn, true)
      .accountsPartial({
        authority: this.authority,
        stablecoin,
        oracleConfig,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Configure an FX pair for cross-currency conversion.
   */
  async configureFxPair(
    sourceMint: PublicKey,
    destMint: PublicKey,
    priceFeed: PublicKey,
    maxStalenessSecs: BN | number,
    maxSlippageBps: number
  ): Promise<string> {
    const [fxPairConfig] = findFxPairPDA(
      this.treasuryAddress,
      sourceMint,
      destMint,
      this.program.programId
    );

    const stalenessBn =
      typeof maxStalenessSecs === "number"
        ? new BN(maxStalenessSecs)
        : maxStalenessSecs;

    return this.program.methods
      .configureFxPair(priceFeed, stalenessBn, maxSlippageBps, true)
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        sourceMint,
        destMint,
        fxPairConfig,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Remove an FX pair configuration and reclaim rent.
   */
  async removeFxPair(
    sourceMint: PublicKey,
    destMint: PublicKey
  ): Promise<string> {
    const [fxPairConfig] = findFxPairPDA(
      this.treasuryAddress,
      sourceMint,
      destMint,
      this.program.programId
    );

    return this.program.methods
      .removeFxPair()
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        fxPairConfig,
      })
      .rpc();
  }

  // ── FX Conversion ─────────────────────────────────────────────────────

  /**
   * Convert tokens from one stablecoin to another using an FX oracle.
   */
  async convert(
    sourceMint: PublicKey,
    destMint: PublicKey,
    amount: BN | number,
    minDestAmount: BN | number
  ): Promise<string> {
    const [sourceStablecoin] = findStablecoinPDA(
      sourceMint,
      this.program.programId
    );
    const [destStablecoin] = findStablecoinPDA(
      destMint,
      this.program.programId
    );
    const [fxPairConfig] = findFxPairPDA(
      this.treasuryAddress,
      sourceMint,
      destMint,
      this.program.programId
    );

    // Fetch the FX pair to get the price feed
    const fxPair = await this.program.account.fxPairConfig.fetch(fxPairConfig);
    const priceFeed = (fxPair as any).priceFeed as PublicKey;

    const converterSourceAccount = getAssociatedTokenAddressSync(
      sourceMint,
      this.authority,
      true,
      TOKEN_2022_PROGRAM_ID
    );
    const converterDestAccount = getAssociatedTokenAddressSync(
      destMint,
      this.authority,
      true,
      TOKEN_2022_PROGRAM_ID
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;
    const minDestBn =
      typeof minDestAmount === "number" ? new BN(minDestAmount) : minDestAmount;

    return this.program.methods
      .convert(amountBn, minDestBn)
      .accountsPartial({
        converter: this.authority,
        treasury: this.treasuryAddress,
        sourceStablecoin,
        destStablecoin,
        sourceMint,
        destMint,
        converterSourceAccount,
        converterDestAccount,
        fxPairConfig,
        priceFeed,
        sourceTokenProgram: TOKEN_2022_PROGRAM_ID,
        destTokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  /** Create an Anchor Program instance from a connection and authority. */
  private static getProgram(
    connection: Connection,
    authority: PublicKey,
    programId: PublicKey
  ): Program<any> {
    // Use a read-only provider when we only have a PublicKey
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: authority,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      } as Wallet,
      { commitment: "confirmed" }
    );

    // Load IDL from the target directory at import time or use a placeholder.
    // In production, IDL is typically loaded separately.
    // We use require to avoid async top-level import issues.
    let idl: any;
    try {
      idl = require("../../../target/idl/viex_treasury.json");
    } catch {
      throw new Error(
        "Could not load IDL. Ensure target/idl/viex_treasury.json exists or provide IDL manually."
      );
    }

    return new Program(idl, provider);
  }
}
