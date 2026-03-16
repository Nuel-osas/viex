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
} from "./shared";

export function registerAuthorityCommands(program: Command): void {
  const authority = program
    .command("authority")
    .description("Manage stablecoin authority");

  // ── nominate ──────────────────────────────────────────────────────────────
  authority
    .command("nominate")
    .description("Nominate a new authority (requires acceptance)")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--new-authority <pubkey>", "New authority public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Nominating New Authority");

        const mintPk = new PublicKey(opts.mint);
        const newAuthorityPk = new PublicKey(opts.newAuthority);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .nominateAuthority(newAuthorityPk)
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
            })
        );

        logSuccess("Authority nominated!");
        logField("Mint", mintPk.toBase58());
        logField("New Authority", newAuthorityPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── accept ────────────────────────────────────────────────────────────────
  authority
    .command("accept")
    .description("Accept a pending authority nomination")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Accepting Authority");

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .acceptAuthority()
            .accountsPartial({
              newAuthority: keypair.publicKey,
              stablecoin: stablecoinPDA,
            })
        );

        logSuccess("Authority accepted!");
        logField("Mint", mintPk.toBase58());
        logField("New Authority", keypair.publicKey.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── transfer (direct, no nomination) ──────────────────────────────────────
  authority
    .command("transfer")
    .description("Directly transfer authority (no nomination step)")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--new-authority <pubkey>", "New authority public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Transferring Authority");

        const mintPk = new PublicKey(opts.mint);
        const newAuthorityPk = new PublicKey(opts.newAuthority);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .transferAuthority(newAuthorityPk)
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
            })
        );

        logSuccess("Authority transferred!");
        logField("Mint", mintPk.toBase58());
        logField("New Authority", newAuthorityPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
