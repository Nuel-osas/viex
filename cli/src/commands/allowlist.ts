import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findAllowlistPDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
} from "./shared";

export function registerAllowlistCommands(program: Command): void {
  const allowlist = program
    .command("allowlist")
    .description("Manage allowlisted addresses");

  // ── add ───────────────────────────────────────────────────────────────────
  allowlist
    .command("add")
    .description("Add an address to the allowlist")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--address <addr>", "Address to allowlist")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Adding to Allowlist");

        const mintPk = new PublicKey(opts.mint);
        const targetPk = new PublicKey(opts.address);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [allowlistPDA] = findAllowlistPDA(stablecoinPDA, targetPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .addToAllowlist()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              target: targetPk,
              allowlistEntry: allowlistPDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("Address added to allowlist!");
        logField("Mint", mintPk.toBase58());
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── remove ────────────────────────────────────────────────────────────────
  allowlist
    .command("remove")
    .description("Remove an address from the allowlist")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--address <addr>", "Address to remove")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Removing from Allowlist");

        const mintPk = new PublicKey(opts.mint);
        const targetPk = new PublicKey(opts.address);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [allowlistPDA] = findAllowlistPDA(stablecoinPDA, targetPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .removeFromAllowlist()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              allowlistEntry: allowlistPDA,
            })
        );

        logSuccess("Address removed from allowlist!");
        logField("Mint", mintPk.toBase58());
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
