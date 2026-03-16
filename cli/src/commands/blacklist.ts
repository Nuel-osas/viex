import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findBlacklistPDA,
  findRolePDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
} from "./shared";

export function registerBlacklistCommands(program: Command): void {
  const blacklist = program
    .command("blacklist")
    .description("Manage blacklisted addresses");

  // ── add ───────────────────────────────────────────────────────────────────
  blacklist
    .command("add")
    .description("Add an address to the blacklist")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--address <addr>", "Address to blacklist")
    .requiredOption("--reason <reason>", "Reason for blacklisting")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Adding to Blacklist");

        const mintPk = new PublicKey(opts.mint);
        const targetPk = new PublicKey(opts.address);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [blacklistPDA] = findBlacklistPDA(stablecoinPDA, targetPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "blacklister", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .addToBlacklist(opts.reason)
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              target: targetPk,
              blacklistEntry: blacklistPDA,
              roleAssignment: rolePDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("Address blacklisted!");
        logField("Mint", mintPk.toBase58());
        logField("Address", targetPk.toBase58());
        logField("Reason", opts.reason);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── remove ────────────────────────────────────────────────────────────────
  blacklist
    .command("remove")
    .description("Remove an address from the blacklist")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--address <addr>", "Address to remove")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Removing from Blacklist");

        const mintPk = new PublicKey(opts.mint);
        const targetPk = new PublicKey(opts.address);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [blacklistPDA] = findBlacklistPDA(stablecoinPDA, targetPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "blacklister", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .removeFromBlacklist()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              blacklistEntry: blacklistPDA,
              roleAssignment: rolePDA,
            })
        );

        logSuccess("Address removed from blacklist!");
        logField("Mint", mintPk.toBase58());
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── close ─────────────────────────────────────────────────────────────────
  blacklist
    .command("close")
    .description("Close a blacklist entry to reclaim rent")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--address <addr>", "Blacklisted address to close")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Closing Blacklist Entry");

        const mintPk = new PublicKey(opts.mint);
        const targetPk = new PublicKey(opts.address);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [blacklistPDA] = findBlacklistPDA(stablecoinPDA, targetPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "blacklister", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .closeBlacklistEntry()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              blacklistEntry: blacklistPDA,
              roleAssignment: rolePDA,
            })
        );

        logSuccess("Blacklist entry closed! Rent reclaimed.");
        logField("Mint", mintPk.toBase58());
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
