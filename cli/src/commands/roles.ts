import { Command } from "commander";
import { PublicKey } from "@solana/web3.js";
import {
  loadKeypair,
  getConnection,
  getProgram,
  findStablecoinPDA,
  findRolePDA,
  findMinterInfoPDA,
  roleToAnchor,
  roleToSeedString,
  logSuccess,
  logHeader,
  logField,
  logInfo,
  handleError,
  sendAndConfirmTx,
  SYSTEM_PROGRAM_ID,
  VIEX_TREASURY_PROGRAM_ID,
} from "./shared";
import chalk from "chalk";

export function registerRolesCommands(program: Command): void {
  const roles = program
    .command("roles")
    .description("Manage roles for a stablecoin");

  // ── assign ────────────────────────────────────────────────────────────────
  roles
    .command("assign")
    .description("Assign a role to an address")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--role <role>", "Role: minter, burner, blacklister, pauser, seizer")
    .requiredOption("--address <addr>", "Address to assign role to")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Assigning Role");

        const mintPk = new PublicKey(opts.mint);
        const assigneePk = new PublicKey(opts.address);
        const roleStr = roleToSeedString(opts.role);
        const roleAnchor = roleToAnchor(opts.role);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, roleStr, assigneePk);

        const accounts: any = {
          authority: keypair.publicKey,
          stablecoin: stablecoinPDA,
          assignee: assigneePk,
          roleAssignment: rolePDA,
          systemProgram: SYSTEM_PROGRAM_ID,
        };

        // If assigning minter role, include minterInfo PDA
        if (roleStr === "minter") {
          const [minterInfoPDA] = findMinterInfoPDA(stablecoinPDA, assigneePk);
          accounts.minterInfo = minterInfoPDA;
        } else {
          accounts.minterInfo = null;
        }

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .assignRole(roleAnchor)
            .accountsPartial(accounts)
        );

        logSuccess(`Role '${opts.role}' assigned!`);
        logField("Mint", mintPk.toBase58());
        logField("Role", opts.role);
        logField("Assignee", assigneePk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── revoke ────────────────────────────────────────────────────────────────
  roles
    .command("revoke")
    .description("Revoke a role from an address")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--role <role>", "Role: minter, burner, blacklister, pauser, seizer")
    .requiredOption("--address <addr>", "Address to revoke role from")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Revoking Role");

        const mintPk = new PublicKey(opts.mint);
        const assigneePk = new PublicKey(opts.address);
        const roleStr = roleToSeedString(opts.role);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, roleStr, assigneePk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .revokeRole()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              roleAssignment: rolePDA,
            })
        );

        logSuccess(`Role '${opts.role}' revoked!`);
        logField("Mint", mintPk.toBase58());
        logField("Role", opts.role);
        logField("Address", assigneePk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── close ─────────────────────────────────────────────────────────────────
  roles
    .command("close")
    .description("Close a role account to reclaim rent")
    .requiredOption("--mint <mint>", "Mint public key")
    .requiredOption("--role <role>", "Role: minter, burner, blacklister, pauser, seizer")
    .requiredOption("--address <addr>", "Address whose role to close")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Closing Role Account");

        const mintPk = new PublicKey(opts.mint);
        const assigneePk = new PublicKey(opts.address);
        const roleStr = roleToSeedString(opts.role);

        const [stablecoinPDA] = findStablecoinPDA(mintPk);
        const [rolePDA] = findRolePDA(stablecoinPDA, roleStr, assigneePk);

        const txSig = await sendAndConfirmTx(
          pg,
          pg.methods
            .closeRole()
            .accountsPartial({
              authority: keypair.publicKey,
              stablecoin: stablecoinPDA,
              roleAssignment: rolePDA,
            })
        );

        logSuccess("Role account closed! Rent reclaimed.");
        logField("Mint", mintPk.toBase58());
        logField("Role", opts.role);
        logField("Address", assigneePk.toBase58());
        logField("Transaction", txSig);
      } catch (err) {
        handleError(err);
      }
    });

  // ── list ──────────────────────────────────────────────────────────────────
  roles
    .command("list")
    .description("List all role assignments for a stablecoin")
    .requiredOption("--mint <mint>", "Mint public key")
    .action(async (opts) => {
      try {
        const parent = program.opts();
        const keypair = loadKeypair(parent.keypair);
        const connection = getConnection(parent.cluster || "localnet");
        const pg = getProgram(connection, keypair);

        logHeader("Role Assignments");

        const mintPk = new PublicKey(opts.mint);
        const [stablecoinPDA] = findStablecoinPDA(mintPk);

        // Fetch all role assignment accounts filtered by stablecoin
        const accounts = await (pg.account as any).roleAssignment.all([
          {
            memcmp: {
              offset: 8, // after discriminator
              bytes: stablecoinPDA.toBase58(),
            },
          },
        ]);

        if (accounts.length === 0) {
          logInfo("No roles assigned for this stablecoin.");
          return;
        }

        logField("Mint", mintPk.toBase58());
        logField("Total Roles", accounts.length.toString());
        console.log();

        for (const acc of accounts) {
          const data = acc.account;
          const roleKey = Object.keys(data.role)[0];
          const status = data.active ? chalk.green("Active") : chalk.red("Revoked");
          console.log(
            `  ${chalk.bold(roleKey.padEnd(14))} ${data.assignee.toBase58()}  ${status}`
          );
        }
      } catch (err) {
        handleError(err);
      }
    });
}
