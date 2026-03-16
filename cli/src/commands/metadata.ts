import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";

export function registerMetadataCommands(program: Command): void {
  const metadata = program
    .command("metadata")
    .description("Manage stablecoin metadata");

  metadata
    .command("update")
    .description("Update the metadata URI for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--uri <uri>", "New metadata URI")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Updating Metadata");

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .updateMetadata(opts.uri)
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
        );

        logSuccess("Metadata updated!");
        logField("Mint", mintPk.toBase58());
        logField("URI", opts.uri);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
