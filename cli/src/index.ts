import { Command } from "commander";
import chalk from "chalk";

import { registerTreasuryCommands } from "./commands/treasury";
import { registerMintCommands } from "./commands/mint";
import { registerBurnCommands } from "./commands/burn";
import { registerRolesCommands } from "./commands/roles";
import { registerBlacklistCommands } from "./commands/blacklist";
import { registerSeizeCommands } from "./commands/seize";
import { registerAllowlistCommands } from "./commands/allowlist";
import { registerKycCommands } from "./commands/kyc";
import { registerTravelRuleCommands } from "./commands/travel-rule";
import { registerFxCommands } from "./commands/fx";
import { registerAuthorityCommands } from "./commands/authority";
import { registerMetadataCommands } from "./commands/metadata";
import { registerOracleCommands } from "./commands/oracle";
import { registerStatusCommands } from "./commands/status";

const program = new Command();

program
  .name("viex")
  .description(
    chalk.bold("VIEX Treasury CLI") +
    " - Multi-currency stablecoin treasury management on Solana"
  )
  .version("0.1.0")
  .option(
    "--cluster <cluster>",
    "Solana cluster: localnet, devnet, mainnet, or custom RPC URL",
    "localnet"
  )
  .option(
    "--keypair <path>",
    "Path to keypair file (default: ~/.config/solana/id.json)"
  );

// Register all command groups
registerTreasuryCommands(program);
registerMintCommands(program);
registerBurnCommands(program);
registerRolesCommands(program);
registerBlacklistCommands(program);
registerSeizeCommands(program);
registerAllowlistCommands(program);
registerKycCommands(program);
registerTravelRuleCommands(program);
registerFxCommands(program);
registerAuthorityCommands(program);
registerMetadataCommands(program);
registerOracleCommands(program);
registerStatusCommands(program);

// Parse and execute
program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("Fatal error:"), err.message);
  process.exit(1);
});
