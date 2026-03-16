import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findTreasuryPDA,
  findStablecoinPDA,
  findFxPairPDA,
  humanToRaw,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";

export function registerFxCommands(program: Command): void {
  // ── convert ───────────────────────────────────────────────────────────────
  program
    .command("convert")
    .description("Convert between two stablecoins using FX rate")
    .requiredOption("--source-mint <mint>", "Source mint public key")
    .requiredOption("--dest-mint <mint>", "Destination mint public key")
    .requiredOption("--amount <amt>", "Source amount (human-readable)")
    .option("--min-dest <amt>", "Minimum destination amount", "0")
    .option("--decimals <d>", "Source decimals", "6")
    .option("--dest-decimals <d>", "Destination decimals", "6")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Converting Currency");

        const sourceMintPk = new PublicKey(opts.sourceMint);
        const destMintPk = new PublicKey(opts.destMint);
        const sourceDecimals = parseInt(opts.decimals);
        const destDecimals = parseInt(opts.destDecimals);
        const sourceAmount = humanToRaw(opts.amount, sourceDecimals);
        const minDestAmount = humanToRaw(opts.minDest, destDecimals);

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [sourceStablecoinPDA] = findStablecoinPDA(sourceMintPk);
        const [destStablecoinPDA] = findStablecoinPDA(destMintPk);
        const [fxPairPDA] = findFxPairPDA(treasuryPDA, sourceMintPk, destMintPk);

        // Fetch FX pair config to get price feed
        const fxPairConfig = await (pg.account as any).fxPairConfig.fetch(fxPairPDA);

        const converterSourceATA = getAssociatedTokenAddressSync(
          sourceMintPk,
          keypair.publicKey,
          true,
          TOKEN_2022_PROGRAM_ID
        );
        const converterDestATA = getAssociatedTokenAddressSync(
          destMintPk,
          keypair.publicKey,
          true,
          TOKEN_2022_PROGRAM_ID
        );

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .convert(sourceAmount, minDestAmount)
            .accountsPartial({
              converter: keypair.publicKey,
              treasury: treasuryPDA,
              sourceStablecoin: sourceStablecoinPDA,
              destStablecoin: destStablecoinPDA,
              sourceMint: sourceMintPk,
              destMint: destMintPk,
              converterSourceAccount: converterSourceATA,
              converterDestAccount: converterDestATA,
              fxPairConfig: fxPairPDA,
              priceFeed: fxPairConfig.priceFeed,
              sourceTokenProgram: TOKEN_2022_PROGRAM_ID,
              destTokenProgram: TOKEN_2022_PROGRAM_ID,
            })
        );

        logSuccess("Currency converted!");
        logField("Source Mint", sourceMintPk.toBase58());
        logField("Dest Mint", destMintPk.toBase58());
        logField("Source Amount", opts.amount);
        logField("Min Dest Amount", opts.minDest);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── fx configure ──────────────────────────────────────────────────────────
  const fx = program
    .command("fx")
    .description("Manage FX pair configurations");

  fx.command("configure")
    .description("Configure an FX pair between two mints")
    .requiredOption("--source-mint <mint>", "Source mint public key")
    .requiredOption("--dest-mint <mint>", "Destination mint public key")
    .requiredOption("--price-feed <pubkey>", "Oracle price feed public key")
    .option("--max-staleness <secs>", "Maximum staleness in seconds", "300")
    .option("--max-slippage <bps>", "Maximum slippage in basis points", "100")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Configuring FX Pair");

        const sourceMintPk = new PublicKey(opts.sourceMint);
        const destMintPk = new PublicKey(opts.destMint);
        const priceFeedPk = new PublicKey(opts.priceFeed);

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [fxPairPDA] = findFxPairPDA(treasuryPDA, sourceMintPk, destMintPk);

        const maxStaleness = new BN(opts.maxStaleness);
        const maxSlippage = parseInt(opts.maxSlippage);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .configureFxPair(priceFeedPk, maxStaleness, maxSlippage, true)
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              sourceMint: sourceMintPk,
              destMint: destMintPk,
              fxPairConfig: fxPairPDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("FX pair configured!");
        logField("Source Mint", sourceMintPk.toBase58());
        logField("Dest Mint", destMintPk.toBase58());
        logField("Price Feed", priceFeedPk.toBase58());
        logField("Max Staleness", `${opts.maxStaleness}s`);
        logField("Max Slippage", `${opts.maxSlippage} bps`);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── fx remove ─────────────────────────────────────────────────────────────
  fx.command("remove")
    .description("Remove an FX pair configuration (reclaim rent)")
    .requiredOption("--source-mint <mint>", "Source mint public key")
    .requiredOption("--dest-mint <mint>", "Destination mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Removing FX Pair");

        const sourceMintPk = new PublicKey(opts.sourceMint);
        const destMintPk = new PublicKey(opts.destMint);

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [fxPairPDA] = findFxPairPDA(treasuryPDA, sourceMintPk, destMintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .removeFxPair()
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              fxPairConfig: fxPairPDA,
            })
        );

        logSuccess("FX pair removed! Rent reclaimed.");
        logField("Source Mint", sourceMintPk.toBase58());
        logField("Dest Mint", destMintPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
