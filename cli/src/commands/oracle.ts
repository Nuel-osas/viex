import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findOracleConfigPDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
} from "./shared";

export function registerOracleCommands(program: Command): void {
  const oracle = program
    .command("oracle")
    .description("Manage oracle configuration");

  oracle
    .command("configure")
    .description("Configure oracle for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--price-feed <pubkey>", "Oracle price feed public key")
    .requiredOption("--max-deviation <bps>", "Maximum price deviation in basis points")
    .requiredOption("--max-staleness <secs>", "Maximum staleness in seconds")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Configuring Oracle");

        const mintPk = new PublicKey(opts.mint);
        const priceFeedPk = new PublicKey(opts.priceFeed);
        const maxDeviation = parseInt(opts.maxDeviation);
        const maxStaleness = new BN(opts.maxStaleness);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [oracleConfigPDA] = findOracleConfigPDA(stablecoinPDA);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .configureOracle(priceFeedPk, maxDeviation, maxStaleness, true)
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              oracleConfig: oracleConfigPDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("Oracle configured!");
        logField("Mint", mintPk.toBase58());
        logField("Price Feed", priceFeedPk.toBase58());
        logField("Max Deviation", `${opts.maxDeviation} bps`);
        logField("Max Staleness", `${opts.maxStaleness}s`);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
