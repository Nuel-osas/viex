import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import chalk from "chalk";

// ── Program IDs ─────────────────────────────────────────────────────────────

export const VIEX_TREASURY_PROGRAM_ID = new PublicKey(
  "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU"
);

export const VIEX_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY"
);

// ── Token programs ──────────────────────────────────────────────────────────

export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

export const TOKEN_2022_PROGRAM_ID = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111"
);

// ── Seed constants ──────────────────────────────────────────────────────────

const TREASURY_SEED = Buffer.from("treasury");
const STABLECOIN_SEED = Buffer.from("stablecoin");
const ROLE_SEED = Buffer.from("role");
const MINTER_INFO_SEED = Buffer.from("minter_info");
const BLACKLIST_SEED = Buffer.from("blacklist");
const ALLOWLIST_SEED = Buffer.from("allowlist");
const KYC_SEED = Buffer.from("kyc");
const TRAVEL_RULE_SEED = Buffer.from("travel_rule");
const FX_PAIR_SEED = Buffer.from("fx_pair");
const ORACLE_CONFIG_SEED = Buffer.from("oracle_config");

// ── PDA derivation ──────────────────────────────────────────────────────────

export function findTreasuryPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TREASURY_SEED, authority.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findStablecoinPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [STABLECOIN_SEED, mint.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findRolePDA(
  stablecoin: PublicKey,
  role: string,
  assignee: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ROLE_SEED, stablecoin.toBuffer(), Buffer.from(role), assignee.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findMinterInfoPDA(
  stablecoin: PublicKey,
  minter: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MINTER_INFO_SEED, stablecoin.toBuffer(), minter.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findBlacklistPDA(
  stablecoin: PublicKey,
  address: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BLACKLIST_SEED, stablecoin.toBuffer(), address.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findAllowlistPDA(
  stablecoin: PublicKey,
  address: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ALLOWLIST_SEED, stablecoin.toBuffer(), address.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findKycPDA(
  treasury: PublicKey,
  address: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [KYC_SEED, treasury.toBuffer(), address.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findTravelRulePDA(
  treasury: PublicKey,
  sigHash: Uint8Array | number[]
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TRAVEL_RULE_SEED, treasury.toBuffer(), Buffer.from(sigHash)],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findFxPairPDA(
  treasury: PublicKey,
  sourceMint: PublicKey,
  destMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      FX_PAIR_SEED,
      treasury.toBuffer(),
      sourceMint.toBuffer(),
      destMint.toBuffer(),
    ],
    VIEX_TREASURY_PROGRAM_ID
  );
}

export function findOracleConfigPDA(
  stablecoin: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [ORACLE_CONFIG_SEED, stablecoin.toBuffer()],
    VIEX_TREASURY_PROGRAM_ID
  );
}

// ── Role and KYC helpers ────────────────────────────────────────────────────

export function roleToAnchor(role: string): object {
  switch (role.toLowerCase()) {
    case "minter":
      return { minter: {} };
    case "burner":
      return { burner: {} };
    case "blacklister":
      return { blacklister: {} };
    case "pauser":
      return { pauser: {} };
    case "seizer":
      return { seizer: {} };
    default:
      throw new Error(`Unknown role: ${role}. Valid: minter, burner, blacklister, pauser, seizer`);
  }
}

export function roleToSeedString(role: string): string {
  const r = role.toLowerCase();
  if (!["minter", "burner", "blacklister", "pauser", "seizer"].includes(r)) {
    throw new Error(`Unknown role: ${role}`);
  }
  return r;
}

export function kycLevelToU8(level: string): number {
  switch (level) {
    case "1":
    case "basic":
      return 0;
    case "2":
    case "enhanced":
      return 1;
    case "3":
    case "institutional":
      return 2;
    default:
      throw new Error(`Invalid KYC level: ${level}. Use 1/basic, 2/enhanced, 3/institutional`);
  }
}

export function kycLevelFromU8(level: number): string {
  switch (level) {
    case 0:
      return "Basic";
    case 1:
      return "Enhanced";
    case 2:
      return "Institutional";
    default:
      return `Unknown(${level})`;
  }
}

// ── Wallet / Connection helpers ─────────────────────────────────────────────

export function loadKeypair(keypairPath?: string): Keypair {
  const resolved = keypairPath || path.join(os.homedir(), ".config", "solana", "id.json");
  if (!fs.existsSync(resolved)) {
    throw new Error(`Keypair file not found: ${resolved}`);
  }
  const raw = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function getConnection(cluster: string): Connection {
  let url: string;
  switch (cluster) {
    case "mainnet":
    case "mainnet-beta":
      url = clusterApiUrl("mainnet-beta");
      break;
    case "devnet":
      url = clusterApiUrl("devnet");
      break;
    case "localnet":
    case "localhost":
      url = "http://127.0.0.1:8899";
      break;
    default:
      // Allow custom RPC URLs
      url = cluster.startsWith("http") ? cluster : clusterApiUrl("devnet");
  }
  return new Connection(url, "confirmed");
}

export function getProvider(
  connection: Connection,
  keypair: Keypair
): AnchorProvider {
  const wallet = new Wallet(keypair);
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
}

export function getProgram(
  connection: Connection,
  keypair: Keypair
): Program {
  const provider = getProvider(connection, keypair);
  const idlPath = path.resolve(__dirname, "..", "..", "..", "target", "idl", "viex_treasury.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(`IDL file not found at: ${idlPath}`);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  return new Program(idl, provider);
}

// ── Amount conversion ───────────────────────────────────────────────────────

export function humanToRaw(amount: string, decimals: number): BN {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  let frac = parts[1] || "";
  if (frac.length > decimals) {
    frac = frac.slice(0, decimals);
  }
  frac = frac.padEnd(decimals, "0");
  const raw = whole + frac;
  return new BN(raw);
}

export function rawToHuman(amount: BN, decimals: number): string {
  const str = amount.toString().padStart(decimals + 1, "0");
  const whole = str.slice(0, str.length - decimals);
  const frac = str.slice(str.length - decimals);
  const trimmedFrac = frac.replace(/0+$/, "");
  return trimmedFrac.length > 0 ? `${whole}.${trimmedFrac}` : whole;
}

// ── Presets ─────────────────────────────────────────────────────────────────

export interface StablecoinInitConfig {
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  enableAllowlist: boolean;
  enableDefaultAccountState: boolean;
  enableConfidentialTransfer: boolean;
}

export function getPresetConfig(preset: string): StablecoinInitConfig {
  switch (preset) {
    case "sss-1":
      return {
        enablePermanentDelegate: false,
        enableTransferHook: false,
        enableAllowlist: false,
        enableDefaultAccountState: false,
        enableConfidentialTransfer: false,
      };
    case "sss-2":
      return {
        enablePermanentDelegate: false,
        enableTransferHook: true,
        enableAllowlist: false,
        enableDefaultAccountState: false,
        enableConfidentialTransfer: false,
      };
    case "sss-3":
      return {
        enablePermanentDelegate: true,
        enableTransferHook: true,
        enableAllowlist: true,
        enableDefaultAccountState: true,
        enableConfidentialTransfer: false,
      };
    default:
      throw new Error(`Unknown preset: ${preset}. Valid: sss-1, sss-2, sss-3`);
  }
}

// ── Output helpers ──────────────────────────────────────────────────────────

export function logSuccess(msg: string): void {
  console.log(chalk.green("  ✓ ") + msg);
}

export function logInfo(msg: string): void {
  console.log(chalk.blue("  ℹ ") + msg);
}

export function logError(msg: string): void {
  console.error(chalk.red("  ✗ ") + msg);
}

export function logHeader(msg: string): void {
  console.log("\n" + chalk.bold.cyan(msg));
  console.log(chalk.cyan("─".repeat(60)));
}

export function logField(label: string, value: string): void {
  console.log(chalk.gray(`  ${label.padEnd(24)}: `) + chalk.white(value));
}

export function shortenPubkey(pk: PublicKey | string): string {
  const s = pk.toString();
  return s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s;
}

// ── ATA helper ──────────────────────────────────────────────────────────────

export function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey = TOKEN_2022_PROGRAM_ID
): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata;
}

// ── Error handler ───────────────────────────────────────────────────────────

export function handleError(err: unknown): never {
  if (err instanceof Error) {
    logError(err.message);
    if (process.env.VIEX_DEBUG) {
      console.error(err.stack);
    }
  } else {
    logError(String(err));
  }
  process.exit(1);
}

// ── Transaction helpers ─────────────────────────────────────────────────────

export async function sendAndConfirmTx(
  program: Program,
  methodBuilder: any,
  signers?: Keypair[]
): Promise<string> {
  try {
    const txSig = signers && signers.length > 0
      ? await methodBuilder.signers(signers).rpc()
      : await methodBuilder.rpc();
    return txSig;
  } catch (err: any) {
    if (err.logs) {
      console.error(chalk.yellow("\nTransaction logs:"));
      for (const log of err.logs) {
        console.error(chalk.gray(`  ${log}`));
      }
    }
    throw err;
  }
}
