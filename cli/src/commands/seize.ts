import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findRolePDA,
  findBlacklistPDA,
  logSuccess,
  logHeader,
  logField,
  handleError,
  sendAndConfirmTx,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";

export function registerSeizeCommands(program: Command): void {
  program
    .command("seize")
    .description("Seize tokens from a blacklisted account")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--from <token_account>", "Source token account to seize from")
    .requiredOption("--to <treasury_account>", "Treasury token account to receive seized tokens")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Seizing Tokens");

        const mintPk = new PublicKey(opts.mint);
        const sourcePk = new PublicKey(opts.from);
        const treasuryPk = new PublicKey(opts.to);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "seizer", keypair.publicKey);

        // Get the owner of the source token account to find the blacklist entry
        const sourceAccountInfo = await connection.getParsedAccountInfo(sourcePk);
        let sourceOwner: PublicKey;
        if (sourceAccountInfo.value?.data && "parsed" in sourceAccountInfo.value.data) {
          sourceOwner = new PublicKey(
            sourceAccountInfo.value.data.parsed.info.owner
          );
        } else {
          throw new Error("Could not parse source token account owner");
        }

        const [blacklistPDA] = findBlacklistPDA(stablecoinPDA, sourceOwner);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .seize()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              sourceTokenAccount: sourcePk,
              treasuryTokenAccount: treasuryPk,
              blacklistEntry: blacklistPDA,
              roleAssignment: rolePDA,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
        );

        logSuccess("Tokens seized!");
        logField("Mint", mintPk.toBase58());
        logField("From", sourcePk.toBase58());
        logField("To", treasuryPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
