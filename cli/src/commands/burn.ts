import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findRolePDA,
  findOracleConfigPDA,
  humanToRaw,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";

export function registerBurnCommands(program: Command): void {
  program
    .command("burn")
    .description("Burn tokens from your account")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--amount <amount>", "Amount (human-readable)")
    .option("--decimals <d>", "Decimal places", "6")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Burning Tokens");

        const mintPk = new PublicKey(opts.mint);
        const decimals = parseInt(opts.decimals);
        const amount = humanToRaw(opts.amount, decimals);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "burner", keypair.publicKey);

        const burnerATA = getAssociatedTokenAddressSync(
          mintPk,
          keypair.publicKey,
          true,
          TOKEN_2022_PROGRAM_ID
        );

        const [oracleConfigPDA] = findOracleConfigPDA(stablecoinPDA);

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
          // Oracle not configured
        }

        const accounts: Record<string, any> = {
          burner: keypair.publicKey,
          stablecoin: stablecoinPDA,
          mint: mintPk,
          roleAssignment: rolePDA,
          burnerTokenAccount: burnerATA,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        };
        if (oracleConfig) accounts.oracleConfig = oracleConfig;
        if (priceFeed) accounts.priceFeed = priceFeed;

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .burnTokens(amount)
            .accountsPartial(accounts)
        );

        logSuccess("Tokens burned!");
        logField("Mint", mintPk.toBase58());
        logField("Amount", opts.amount);
        logField("Raw Amount", amount.toString());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
