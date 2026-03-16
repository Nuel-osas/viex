import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findRolePDA,
  findMinterInfoPDA,
  findOracleConfigPDA,
  humanToRaw,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";

export function registerMintCommands(program: Command): void {
  program
    .command("mint")
    .description("Mint tokens to a recipient")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--to <recipient>", "Recipient public key")
    .requiredOption("--amount <amount>", "Amount (human-readable)")
    .option("--decimals <d>", "Decimal places", "6")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Minting Tokens");

        const mintPk = new PublicKey(opts.mint);
        const recipientPk = new PublicKey(opts.to);
        const decimals = parseInt(opts.decimals);
        const amount = humanToRaw(opts.amount, decimals);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "minter", keypair.publicKey);
        const [minterInfoPDA] = findMinterInfoPDA(stablecoinPDA, keypair.publicKey);
        const [oracleConfigPDA] = findOracleConfigPDA(stablecoinPDA);

        const recipientATA = getAssociatedTokenAddressSync(
          mintPk,
          recipientPk,
          true,
          TOKEN_2022_PROGRAM_ID
        );

        // Check if oracle config exists
        let oracleConfig: PublicKey | undefined;
        let priceFeed: PublicKey | undefined;
        try {
          const oracleAccount = await (pg.account as any).oracleConfig.fetch(oracleConfigPDA);
          if (oracleAccount) {
            oracleConfig = oracleConfigPDA;
            priceFeed = oracleAccount.priceFeed;
          }
        } catch {
          // Oracle not configured, pass undefined
        }

        const accounts: Record<string, any> = {
          minter: keypair.publicKey,
          stablecoin: stablecoinPDA,
          mint: mintPk,
          roleAssignment: rolePDA,
          minterInfo: minterInfoPDA,
          recipientTokenAccount: recipientATA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        };
        if (oracleConfig) accounts.oracleConfig = oracleConfig;
        if (priceFeed) accounts.priceFeed = priceFeed;

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .mintTokens(amount)
            .accountsPartial(accounts)
        );

        logSuccess("Tokens minted!");
        logField("Mint", mintPk.toBase58());
        logField("Recipient", recipientPk.toBase58());
        logField("Amount", opts.amount);
        logField("Raw Amount", amount.toString());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── transfer ──────────────────────────────────────────────────────────────
  program
    .command("transfer")
    .description("Transfer tokens to a recipient")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--to <recipient>", "Recipient public key")
    .requiredOption("--amount <amount>", "Amount (human-readable)")
    .option("--decimals <d>", "Decimal places", "6")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");

        logHeader("Transferring Tokens");

        const mintPk = new PublicKey(opts.mint);
        const recipientPk = new PublicKey(opts.to);
        const decimals = parseInt(opts.decimals);
        const amount = humanToRaw(opts.amount, decimals);

        const senderATA = getAssociatedTokenAddressSync(
          mintPk,
          keypair.publicKey,
          true,
          TOKEN_2022_PROGRAM_ID
        );
        const recipientATA = getAssociatedTokenAddressSync(
          mintPk,
          recipientPk,
          true,
          TOKEN_2022_PROGRAM_ID
        );

        // Standard SPL Token transfer (uses token-2022 with transfer hook if configured)
        const { createTransferCheckedInstruction } = await import("@solana/spl-token");
        const { Transaction } = await import("@solana/web3.js");

        const tx = new Transaction().add(
          createTransferCheckedInstruction(
            senderATA,
            mintPk,
            recipientATA,
            keypair.publicKey,
            BigInt(amount.toString()),
            decimals,
            [],
            TOKEN_2022_PROGRAM_ID
          )
        );

        const txSig = await connection.sendTransaction(tx, [keypair]);
        await connection.confirmTransaction(txSig, "confirmed");

        logSuccess("Tokens transferred!");
        logField("Mint", mintPk.toBase58());
        logField("From", keypair.publicKey.toBase58());
        logField("To", recipientPk.toBase58());
        logField("Amount", opts.amount);
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
