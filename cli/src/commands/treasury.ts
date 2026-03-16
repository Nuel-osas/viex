import { Command } from "commander";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findTreasuryPDA,
  findStablecoinPDA,
  getPresetConfig,
  logSuccess,
  logError,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  VIEX_TRANSFER_HOOK_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from "./shared";
import chalk from "chalk";

export function registerTreasuryCommands(program: Command): void {
  // ── init-treasury ─────────────────────────────────────────────────────────
  program
    .command("init-treasury")
    .description("Initialize a new treasury")
    .requiredOption("--name <name>", "Treasury name")
    .requiredOption("--base-currency <cur>", "Base currency (e.g. USD, EUR)")
    .option("--travel-rule-threshold <amt>", "Travel rule threshold", "0")
    .option("--kyc-required", "Require KYC", false)
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Initializing Treasury");

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .initTreasury(
              opts.name,
              opts.baseCurrency,
              new BN(opts.travelRuleThreshold),
              opts.kycRequired
            )
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("Treasury initialized!");
        logField("Treasury PDA", treasuryPDA.toBase58());
        logField("Authority", keypair.publicKey.toBase58());
        logField("Name", opts.name);
        logField("Base Currency", opts.baseCurrency);
        logField("KYC Required", String(opts.kycRequired));
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── init (stablecoin) ─────────────────────────────────────────────────────
  program
    .command("init <preset>")
    .description("Initialize a stablecoin with a preset (sss-1, sss-2, sss-3)")
    .requiredOption("--name <name>", "Stablecoin name")
    .requiredOption("--symbol <sym>", "Token symbol")
    .option("--uri <uri>", "Metadata URI", "")
    .option("--decimals <d>", "Decimal places", "6")
    .requiredOption("--mint <mint>", "Mint keypair path or 'new' to generate")
    .action(async (preset, opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);
        const config = getPresetConfig(preset);

        logHeader(`Initializing Stablecoin (${preset})`);

        let mintKeypair: Keypair;
        if (opts.mint === "new") {
          mintKeypair = Keypair.generate();
          logField("Generated Mint", mintKeypair.publicKey.toBase58());
        } else {
          mintKeypair = loadKeypair(opts.mint);
        }

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [stablecoinPDA] = findStablecoinPDA(mintKeypair.publicKey);

        const accounts: any = {
          authority: keypair.publicKey,
          treasury: treasuryPDA,
          mint: mintKeypair.publicKey,
          stablecoin: stablecoinPDA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SYSTEM_PROGRAM_ID,
        };

        if (config.enableTransferHook) {
          accounts.transferHookProgram = VIEX_TRANSFER_HOOK_PROGRAM_ID;
        } else {
          accounts.transferHookProgram = null;
        }

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .initialize(
              opts.name,
              opts.symbol,
              opts.uri,
              parseInt(opts.decimals),
              config
            )
            .accountsPartial(accounts),
          [mintKeypair]
        );

        logSuccess("Stablecoin initialized!");
        logField("Mint", mintKeypair.publicKey.toBase58());
        logField("Stablecoin PDA", stablecoinPDA.toBase58());
        logField("Treasury", treasuryPDA.toBase58());
        logField("Name", opts.name);
        logField("Symbol", opts.symbol);
        logField("Decimals", opts.decimals);
        logField("Preset", preset);
        logField("Permanent Delegate", String(config.enablePermanentDelegate));
        logField("Transfer Hook", String(config.enableTransferHook));
        logField("Allowlist", String(config.enableAllowlist));
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── register-mint ─────────────────────────────────────────────────────────
  program
    .command("register-mint")
    .description("Register an existing mint with the treasury")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Registering Mint");

        const mintPk = new PublicKey(opts.mint);
        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .registerMint()
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              stablecoin: stablecoinPDA,
            })
        );

        logSuccess("Mint registered with treasury!");
        logField("Mint", mintPk.toBase58());
        logField("Treasury", treasuryPDA.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
