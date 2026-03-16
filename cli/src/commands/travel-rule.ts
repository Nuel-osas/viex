import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as crypto from "crypto";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findTreasuryPDA,
  findTravelRulePDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
} from "./shared";

export function registerTravelRuleCommands(program: Command): void {
  const travelRule = program
    .command("travel-rule")
    .description("Manage travel rule messages");

  // ── attach ────────────────────────────────────────────────────────────────
  travelRule
    .command("attach")
    .description("Attach a travel rule message to a transfer")
    .requiredOption("--transfer-sig <hex>", "Transfer signature (hex-encoded, 64 bytes)")
    .requiredOption("--mint <mint>", "Source mint public key")
    .requiredOption("--amount <amt>", "Amount transferred")
    .requiredOption("--originator-name <n>", "Originator name")
    .requiredOption("--originator-vasp <v>", "Originator VASP ID")
    .requiredOption("--beneficiary-name <n>", "Beneficiary name")
    .requiredOption("--beneficiary-vasp <v>", "Beneficiary VASP ID")
    .requiredOption("--originator <pubkey>", "Originator public key")
    .requiredOption("--beneficiary <pubkey>", "Beneficiary public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Attaching Travel Rule Message");

        // Parse the transfer signature from hex
        const sigBytes = Buffer.from(opts.transferSig, "hex");
        if (sigBytes.length !== 64) {
          throw new Error(`Transfer signature must be 64 bytes, got ${sigBytes.length}`);
        }
        const transferSignature = Array.from(sigBytes);

        // Create SHA-256 hash of the signature for PDA seed
        const sigHash = Array.from(crypto.createHash("sha256").update(sigBytes).digest());

        const mintPk = new PublicKey(opts.mint);
        const originatorPk = new PublicKey(opts.originator);
        const beneficiaryPk = new PublicKey(opts.beneficiary);
        const amount = new BN(opts.amount);

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [travelRulePDA] = findTravelRulePDA(treasuryPDA, sigHash);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .attachTravelRule(
              transferSignature,
              sigHash,
              amount,
              opts.originatorName,
              opts.originatorVasp,
              opts.beneficiaryName,
              opts.beneficiaryVasp
            )
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              sourceMint: mintPk,
              originator: originatorPk,
              beneficiary: beneficiaryPk,
              travelRuleMessage: travelRulePDA,
              systemProgram: SYSTEM_PROGRAM_ID,
            })
        );

        logSuccess("Travel rule message attached!");
        logField("Transfer Sig", opts.transferSig.slice(0, 16) + "...");
        logField("Mint", mintPk.toBase58());
        logField("Amount", opts.amount);
        logField("Originator", opts.originatorName);
        logField("Originator VASP", opts.originatorVasp);
        logField("Beneficiary", opts.beneficiaryName);
        logField("Beneficiary VASP", opts.beneficiaryVasp);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── close ─────────────────────────────────────────────────────────────────
  travelRule
    .command("close")
    .description("Close a travel rule message to reclaim rent")
    .requiredOption("--transfer-sig <hex>", "Transfer signature (hex-encoded, 64 bytes)")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Closing Travel Rule Message");

        const sigBytes = Buffer.from(opts.transferSig, "hex");
        if (sigBytes.length !== 64) {
          throw new Error(`Transfer signature must be 64 bytes, got ${sigBytes.length}`);
        }
        const sigHash = Array.from(crypto.createHash("sha256").update(sigBytes).digest());

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);
        const [travelRulePDA] = findTravelRulePDA(treasuryPDA, sigHash);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .closeTravelRule()
            .accountsPartial({
              authority: keypair.publicKey,
              treasury: treasuryPDA,
              travelRuleMessage: travelRulePDA,
            })
        );

        logSuccess("Travel rule message closed! Rent reclaimed.");
        logField("Transfer Sig", opts.transferSig.slice(0, 16) + "...");
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
