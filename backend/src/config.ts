import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, Idl } from "@coral-xyz/anchor";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

export const PORT = parseInt(process.env.PORT || "3001", 10);
export const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
export const API_KEY = process.env.API_KEY || "";
export const VIEX_TREASURY_PROGRAM_ID = new PublicKey(
  process.env.VIEX_TREASURY_PROGRAM_ID ||
    "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU"
);
export const VIEX_TRANSFER_HOOK_PROGRAM_ID = new PublicKey(
  process.env.VIEX_TRANSFER_HOOK_PROGRAM_ID ||
    "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY"
);

// ---------------------------------------------------------------------------
// Solana connection
// ---------------------------------------------------------------------------

export const connection = new Connection(RPC_URL, "confirmed");

// ---------------------------------------------------------------------------
// Operator keypair (for signing transactions)
// ---------------------------------------------------------------------------

function loadKeypair(): Keypair {
  const keypairPath = (process.env.OPERATOR_KEYPAIR || "").replace(
    "~",
    process.env.HOME || ""
  );
  try {
    if (keypairPath && fs.existsSync(keypairPath)) {
      const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
      return Keypair.fromSecretKey(Uint8Array.from(raw));
    }
  } catch {
    console.warn("Could not load operator keypair, using random keypair");
  }
  return Keypair.generate();
}

export const operatorKeypair = loadKeypair();

// ---------------------------------------------------------------------------
// Anchor provider & program
// ---------------------------------------------------------------------------

const wallet = new Wallet(operatorKeypair);

export const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
});

function loadIdl(): Idl {
  const idlPath = path.resolve(
    __dirname,
    "../../target/idl/viex_treasury.json"
  );
  try {
    if (fs.existsSync(idlPath)) {
      return JSON.parse(fs.readFileSync(idlPath, "utf-8")) as Idl;
    }
  } catch {
    console.warn("Could not load IDL from file");
  }
  // Return a minimal IDL so the program object can still be constructed
  return {
    address: VIEX_TREASURY_PROGRAM_ID.toBase58(),
    metadata: { name: "viex_treasury", version: "0.1.0", spec: "0.1.0" },
    instructions: [],
    accounts: [],
    types: [],
  } as unknown as Idl;
}

export const idl = loadIdl();

export const program = new Program(idl, provider);

// ---------------------------------------------------------------------------
// PDA helpers — re-exported from viex-sdk (see import at top)
// Legacy aliases for backward compatibility with services
// ---------------------------------------------------------------------------

// Legacy aliases mapping old names to viex-sdk exports
import {
  findTreasuryPDA,
  findStablecoinPDA,
  findBlacklistPDA,
  findAllowlistPDA,
  findRolePDA,
  findMinterInfoPDA,
  findKycPDA,
  findTravelRulePDA,
  findFxPairPDA,
  findOracleConfigPDA,
} from "viex-sdk";

export const findTreasuryPda = findTreasuryPDA;
export const findStablecoinPda = findStablecoinPDA;
export const findBlacklistEntryPda = findBlacklistPDA;
export const findAllowlistEntryPda = findAllowlistPDA;
export const findRoleAssignmentPda = findRolePDA;
export const findMinterInfoPda = findMinterInfoPDA;
export const findKycEntryPda = findKycPDA;
export const findTravelRuleMessagePda = findTravelRulePDA;
export const findFxPairConfigPda = findFxPairPDA;
export const findOracleConfigPda = findOracleConfigPDA;
