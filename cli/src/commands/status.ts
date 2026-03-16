import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findTreasuryPDA,
  findStablecoinPDA,
  findRolePDA,
  rawToHuman,
  logSuccess,
  logHeader,
  logField,
  logInfo,
  logError,
  handleError,
  sendAndConfirmTx,
  TOKEN_2022_PROGRAM_ID,
} from "./shared";
import chalk from "chalk";

export function registerStatusCommands(program: Command): void {
  // ── status (stablecoin) ───────────────────────────────────────────────────
  program
    .command("status")
    .description("Show stablecoin state")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        logHeader("Stablecoin Status");

        try {
          const stablecoin = await (pg.account as any).stablecoin.fetch(stablecoinPDA);

          logField("Name", stablecoin.name);
          logField("Symbol", stablecoin.symbol);
          logField("Mint", stablecoin.mint.toBase58());
          logField("Authority", stablecoin.authority.toBase58());
          logField("Treasury", stablecoin.treasury.toBase58());
          logField("Decimals", stablecoin.decimals.toString());
          logField("URI", stablecoin.uri || "(none)");
          logField("Paused", stablecoin.paused ? chalk.red("Yes") : chalk.green("No"));

          console.log();
          logField("Permanent Delegate", String(stablecoin.enablePermanentDelegate));
          logField("Transfer Hook", String(stablecoin.enableTransferHook));
          logField("Allowlist", String(stablecoin.enableAllowlist));

          console.log();
          logField("Total Minted", rawToHuman(stablecoin.totalMinted, stablecoin.decimals));
          logField("Total Burned", rawToHuman(stablecoin.totalBurned, stablecoin.decimals));
          const supply = stablecoin.totalMinted.sub(stablecoin.totalBurned);
          logField("Net Supply", rawToHuman(supply, stablecoin.decimals));
          logField("Supply Cap", stablecoin.supplyCap.eq(new BN(0))
            ? "Unlimited"
            : rawToHuman(stablecoin.supplyCap, stablecoin.decimals));

          if (stablecoin.pendingAuthority) {
            console.log();
            logField("Pending Authority", stablecoin.pendingAuthority.toBase58());
          }
        } catch {
          logError("Stablecoin account not found for this mint.");
        }
      } catch (err) {
        handleError(err);
      }
    });

  // ── supply ────────────────────────────────────────────────────────────────
  program
    .command("supply")
    .description("Show supply information for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        logHeader("Supply Information");

        try {
          const stablecoin = await (pg.account as any).stablecoin.fetch(stablecoinPDA);

          const supply = stablecoin.totalMinted.sub(stablecoin.totalBurned);

          logField("Mint", mintPk.toBase58());
          logField("Symbol", stablecoin.symbol);
          logField("Decimals", stablecoin.decimals.toString());
          console.log();
          logField("Total Minted", rawToHuman(stablecoin.totalMinted, stablecoin.decimals));
          logField("Total Burned", rawToHuman(stablecoin.totalBurned, stablecoin.decimals));
          logField("Net Supply", rawToHuman(supply, stablecoin.decimals));
          logField("Supply Cap", stablecoin.supplyCap.eq(new BN(0))
            ? "Unlimited"
            : rawToHuman(stablecoin.supplyCap, stablecoin.decimals));

          if (!stablecoin.supplyCap.eq(new BN(0))) {
            const remaining = stablecoin.supplyCap.sub(supply);
            logField("Remaining Capacity", rawToHuman(remaining, stablecoin.decimals));
            const utilization = supply.muln(10000).div(stablecoin.supplyCap).toNumber() / 100;
            logField("Utilization", `${utilization.toFixed(2)}%`);
          }

          // Also fetch on-chain mint supply
          const mintInfo = await connection.getTokenSupply(mintPk);
          logField("On-chain Supply", mintInfo.value.uiAmountString || "0");
        } catch {
          logError("Stablecoin account not found for this mint.");
        }
      } catch (err) {
        handleError(err);
      }
    });

  // ── treasury-status ───────────────────────────────────────────────────────
  program
    .command("treasury-status")
    .description("Show treasury overview with all mints")
    .action(async () => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        const [treasuryPDA] = findTreasuryPDA(keypair.publicKey);

        logHeader("Treasury Overview");

        try {
          const treasury = await (pg.account as any).treasury.fetch(treasuryPDA);

          logField("Treasury PDA", treasuryPDA.toBase58());
          logField("Authority", treasury.authority.toBase58());
          logField("Name", treasury.name);
          logField("Base Currency", treasury.baseCurrency);
          logField("KYC Required", treasury.kycRequired ? chalk.yellow("Yes") : "No");
          logField("Travel Rule Threshold", treasury.travelRuleThreshold.toString());
          logField("Created At", new Date(treasury.createdAt.toNumber() * 1000).toISOString());
          logField("Registered Mints", treasury.mints.length.toString());

          if (treasury.mints.length > 0) {
            console.log();
            console.log(chalk.bold("  Registered Mints:"));
            console.log(chalk.cyan("  " + "-".repeat(56)));

            for (let i = 0; i < treasury.mints.length; i++) {
              const mintPk = treasury.mints[i];
              const [stablecoinPDA] = findStablecoinPDA(mintPk);

              try {
                const stablecoin = await (pg.account as any).stablecoin.fetch(stablecoinPDA);
                const supply = stablecoin.totalMinted.sub(stablecoin.totalBurned);
                const status = stablecoin.paused ? chalk.red("PAUSED") : chalk.green("ACTIVE");

                console.log(
                  `\n  ${chalk.bold(`[${i + 1}]`)} ${chalk.white(stablecoin.symbol)} - ${stablecoin.name}`
                );
                console.log(`      Mint:   ${mintPk.toBase58()}`);
                console.log(`      Supply: ${rawToHuman(supply, stablecoin.decimals)} ${stablecoin.symbol}`);
                console.log(`      Status: ${status}`);
              } catch {
                console.log(
                  `\n  ${chalk.bold(`[${i + 1}]`)} ${mintPk.toBase58()} ${chalk.gray("(could not fetch details)")}`
                );
              }
            }
          } else {
            logInfo("No mints registered yet.");
          }
        } catch {
          logError("Treasury account not found. Initialize one with 'viex init-treasury'.");
        }
      } catch (err) {
        handleError(err);
      }
    });

  // ── freeze ────────────────────────────────────────────────────────────────
  program
    .command("freeze")
    .description("Freeze a token account")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--account <token_account>", "Token account to freeze")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Freezing Account");

        const mintPk = new PublicKey(opts.mint);
        const tokenAccountPk = new PublicKey(opts.account);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "pauser", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .freezeAccount()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              tokenAccount: tokenAccountPk,
              roleAssignment: rolePDA,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
        );

        logSuccess("Account frozen!");
        logField("Mint", mintPk.toBase58());
        logField("Account", tokenAccountPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── thaw ──────────────────────────────────────────────────────────────────
  program
    .command("thaw")
    .description("Thaw a frozen token account")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--account <token_account>", "Token account to thaw")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Thawing Account");

        const mintPk = new PublicKey(opts.mint);
        const tokenAccountPk = new PublicKey(opts.account);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "pauser", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .thawAccount()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              tokenAccount: tokenAccountPk,
              roleAssignment: rolePDA,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            })
        );

        logSuccess("Account thawed!");
        logField("Mint", mintPk.toBase58());
        logField("Account", tokenAccountPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── pause ─────────────────────────────────────────────────────────────────
  program
    .command("pause")
    .description("Pause all operations for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Pausing Stablecoin");

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "pauser", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .pause()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              roleAssignment: rolePDA,
            })
        );

        logSuccess("Stablecoin paused!");
        logField("Mint", mintPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── unpause ───────────────────────────────────────────────────────────────
  program
    .command("unpause")
    .description("Unpause operations for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Unpausing Stablecoin");

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, "pauser", keypair.publicKey);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .unpause()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              mint: mintPk,
              roleAssignment: rolePDA,
            })
        );

        logSuccess("Stablecoin unpaused!");
        logField("Mint", mintPk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });
}
