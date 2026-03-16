import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findTreasuryPDA,
  findKycPDA,
  kycLevelToU8,
  kycLevelFromU8,
  logSuccess,
  logInfo,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
} from "./shared";
import chalk from "chalk";

export function registerKycCommands(program: Command): void {
  const kyc = program
    .command("kyc")
    .description("Manage KYC entries");

  // ── approve ───────────────────────────────────────────────────────────────
  kyc
    .command("approve")
    .description("Approve KYC for an address")
    .requiredOption("--address <addr>", "Address to approve KYC for")
    .requiredOption("--level <level>", "KYC level: 1/basic, 2/enhanced, 3/institutional")
    .requiredOption("--jurisdiction <xxx>", "3-letter jurisdiction code (e.g. USA)")
    .requiredOption("--provider <name>", "KYC provider name")
    .option("--expires <timestamp>", "Expiration timestamp (unix seconds)", "0")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Approving KYC");

        const targetPk = new PublicKey(opts.address);
        const level = kycLevelToU8(opts.level);

        // Convert jurisdiction to 3-byte array
        const jurisdictionStr = opts.jurisdiction.toUpperCase().padEnd(3, " ").slice(0, 3);
        const jurisdiction = Array.from(Buffer.from(jurisdictionStr));

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [kycPDA] = findKycPDA(treasuryPDA, targetPk);

        const expiresAt = new BN(opts.expires);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .kycApprove(level, jurisdiction, opts.provider, expiresAt)
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              target: targetPk,
              kycEntry: kycPDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("KYC approved!");
        logField("Address", targetPk.toBase58());
        logField("Level", kycLevelFromU8(level));
        logField("Jurisdiction", jurisdictionStr);
        logField("Provider", opts.provider);
        logField("Expires", expiresAt.toString() === "0" ? "Never" : new Date(expiresAt.toNumber() * 1000).toISOString());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── revoke ────────────────────────────────────────────────────────────────
  kyc
    .command("revoke")
    .description("Revoke KYC for an address")
    .requiredOption("--address <addr>", "Address to revoke KYC for")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Revoking KYC");

        const targetPk = new PublicKey(opts.address);
        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [kycPDA] = findKycPDA(treasuryPDA, targetPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .kycRevoke()
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              kycEntry: kycPDA,
            })
        );

        logSuccess("KYC revoked!");
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── close ─────────────────────────────────────────────────────────────────
  kyc
    .command("close")
    .description("Close a KYC entry to reclaim rent")
    .requiredOption("--address <addr>", "Address whose KYC entry to close")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Closing KYC Entry");

        const targetPk = new PublicKey(opts.address);
        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [kycPDA] = findKycPDA(treasuryPDA, targetPk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .kycClose()
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              kycEntry: kycPDA,
            })
        );

        logSuccess("KYC entry closed! Rent reclaimed.");
        logField("Address", targetPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── check ─────────────────────────────────────────────────────────────────
  kyc
    .command("check")
    .description("Check KYC status for an address")
    .requiredOption("--address <addr>", "Address to check")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("KYC Status");

        const targetPk = new PublicKey(opts.address);
        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [kycPDA] = findKycPDA(treasuryPDA, targetPk);

        try {
          const kycEntry = await (pg.account as any).kycEntry.fetch(kycPDA);

          const levelKey = Object.keys(kycEntry.kycLevel)[0];
          const jurisdiction = Buffer.from(kycEntry.jurisdiction).toString().trim();
          const status = kycEntry.active ? chalk.green("Active") : chalk.red("Revoked");

          logField("Address", targetPk.toBase58());
          logField("Status", status);
          logField("KYC Level", levelKey.charAt(0).toUpperCase() + levelKey.slice(1));
          logField("Jurisdiction", jurisdiction);
          logField("Provider", kycEntry.provider);
          logField("Approved At", new Date(kycEntry.approvedAt.toNumber() * 1000).toISOString());
          logField("Expires At", kycEntry.expiresAt.toNumber() === 0
            ? "Never"
            : new Date(kycEntry.expiresAt.toNumber() * 1000).toISOString());
          logField("Approved By", kycEntry.approvedBy.toBase58());
        } catch {
          logInfo("No KYC entry found for this address.");
        }
      } catch (err) {
        handleError(err);
      }
    });
}
