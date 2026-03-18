# VIEX SDK Reference

## Installation

```bash
# From the project root
cd sdk/core
npm install

# Or reference directly in your project
npm install @solana/web3.js @coral-xyz/anchor @solana/spl-token
# Then import from the sdk/core/src path
```

The SDK requires the IDL file at `target/idl/viex_treasury.json`. Run `anchor build` first if it does not exist.

## Quick Start

```typescript
import {
  ViexTreasury,
  ComplianceModule,
  KycModule,
  TravelRuleModule,
  Role,
  KycLevel,
  Presets,
  findTreasuryPDA,
  findStablecoinPDA,
  VIEX_TREASURY_PROGRAM_ID,
  VIEX_TRANSFER_HOOK_PROGRAM_ID,
} from "@viex/sdk";

import { Connection, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

const connection = new Connection("https://api.devnet.solana.com");
const authority = Keypair.generate(); // or load from file

// 1. Create a treasury
const { treasury, txSig } = await ViexTreasury.createTreasury(
  connection,
  authority.publicKey,
  "Acme Treasury",
  "USD",
  { kycRequired: true, travelRuleThreshold: new BN(3_000_000_000) }
);

// 2. Initialize an SSS-2 stablecoin
const { mint, txSig: initSig } = await treasury.initStablecoin(
  "Acme USD",
  "AUSD",
  "https://metadata.example.com/ausd.json",
  6,
  Presets.compliance(),
  VIEX_TRANSFER_HOOK_PROGRAM_ID
);

// 3. Register the mint with the treasury
await treasury.registerMint(
  findStablecoinPDA(mint.publicKey, VIEX_TREASURY_PROGRAM_ID)[0]
);

// 4. Assign roles
await treasury.assignRole(mint.publicKey, Role.Minter, authority.publicKey);
await treasury.assignRole(mint.publicKey, Role.Burner, authority.publicKey);
await treasury.assignRole(mint.publicKey, Role.Pauser, authority.publicKey);
await treasury.assignRole(mint.publicKey, Role.Blacklister, authority.publicKey);
await treasury.assignRole(mint.publicKey, Role.Seizer, authority.publicKey);

// 5. Mint tokens
await treasury.mint(mint.publicKey, authority.publicKey, 1_000_000_000);

// 6. KYC approve a user
await treasury.kyc.approve(
  userWallet,
  KycLevel.Enhanced,
  "USA",
  "Sumsub",
  0  // never expires
);

// 7. Blacklist a bad actor
await treasury.compliance.blacklistAdd(
  mint.publicKey,
  badActorWallet,
  "OFAC SDN match"
);

// 8. Attach travel rule data
const transferSig = new Uint8Array(64); // from actual transfer
await treasury.travelRule.attach(
  transferSig,
  mint.publicKey,
  5_000_000_000,
  { name: "Alice Corp", vasp: "VASP001" },
  { name: "Bob Ltd", vasp: "VASP002" }
);
```

---

## ViexTreasury Class

The main entry point for all SDK operations.

### Factory Methods

#### `static async createTreasury(connection, authority, name, baseCurrency, opts?)`

Creates a new treasury and returns a `ViexTreasury` instance.

| Parameter | Type | Description |
|-----------|------|-------------|
| `connection` | `Connection` | Solana RPC connection |
| `authority` | `PublicKey` | Treasury owner |
| `name` | `string` | Treasury display name (max 32 chars) |
| `baseCurrency` | `string` | Base currency code (max 10 chars) |
| `opts.travelRuleThreshold` | `BN` | Optional. Default: 3,000,000,000 |
| `opts.kycRequired` | `boolean` | Optional. Default: false |
| `opts.programId` | `PublicKey` | Optional. Custom program ID |

**Returns:** `{ treasury: ViexTreasury, txSig: string }`

#### `static async load(connection, treasuryAddress, authority, programId?)`

Loads an existing treasury by its PDA address.

#### `static async fromAuthority(connection, authority, programId?)`

Loads a treasury by deriving the PDA from the authority public key.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `program` | `Program<any>` | Anchor program instance |
| `connection` | `Connection` | Solana RPC connection |
| `treasuryAddress` | `PublicKey` | Treasury PDA |
| `authority` | `PublicKey` | Current authority |
| `compliance` | `ComplianceModule` | Compliance sub-module |
| `kyc` | `KycModule` | KYC sub-module |
| `travelRule` | `TravelRuleModule` | Travel Rule sub-module |

### Data Methods

#### `async fetchTreasury(): Promise<TreasuryAccount>`

Fetches the on-chain Treasury account.

#### `async fetchStablecoin(mint): Promise<StablecoinAccount>`

Fetches a Stablecoin account by mint address.

### Stablecoin Lifecycle

#### `async initStablecoin(name, symbol, uri, decimals, config, transferHookProgram?)`

Initializes a new stablecoin. Returns `{ mint: Keypair, txSig: string }`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Display name (max 32 chars) |
| `symbol` | `string` | Token symbol (max 10 chars) |
| `uri` | `string` | Metadata URI (max 200 chars) |
| `decimals` | `number` | Token decimals (typically 6) |
| `config` | `StablecoinInitConfig` | Feature flags |
| `transferHookProgram` | `PublicKey` | Optional. Required for SSS-2/SSS-3 |

#### `async registerMint(stablecoinAddress): Promise<string>`

Registers an initialized stablecoin with the treasury.

### Operations

#### `async mint(mint, recipient, amount): Promise<string>`

Mint tokens. Caller must have the Minter role.

#### `async burn(mint, amount): Promise<string>`

Burn tokens from the caller's ATA. Caller must have the Burner role.

#### `async freeze(mint, tokenAccount): Promise<string>`

Freeze a specific token account. Caller must have the Pauser role.

#### `async thaw(mint, tokenAccount): Promise<string>`

Thaw a frozen token account. Caller must have the Pauser role.

#### `async pause(mint): Promise<string>`

Pause all operations on a stablecoin. Caller must have the Pauser role.

#### `async unpause(mint): Promise<string>`

Unpause a stablecoin. Caller must have the Pauser role.

#### `async transfer(mint, to, amount): Promise<string>`

Transfer tokens. Automatically resolves transfer hook extra accounts.

### Role Management

#### `async assignRole(mint, role, assignee): Promise<string>`

Assign a role. Caller must be the stablecoin authority.

#### `async revokeRole(mint, role, assignee): Promise<string>`

Revoke a role (deactivates, keeps account open).

#### `async closeRole(mint, role, assignee): Promise<string>`

Close a deactivated role to reclaim rent.

#### `async setSupplyCap(mint, cap): Promise<string>`

Set supply cap. Pass 0 to remove.

#### `async updateMinterQuota(mint, minter, quota): Promise<string>`

Update a minter's quota.

### Authority Management

#### `async nominateAuthority(mint, newAuthority): Promise<string>`

Begin a two-step authority transfer.

#### `async acceptAuthority(mint): Promise<string>`

Accept a pending nomination. Must be called by the nominated authority.

#### `async transferAuthority(mint, newAuthority): Promise<string>`

Single-step authority transfer (no acceptance required).

### Oracle and FX

#### `async configureOracle(mint, priceFeed, maxDeviationBps, maxStalenessSecs): Promise<string>`

Configure Pyth oracle for peg enforcement on mint/burn.

#### `async configureFxPair(sourceMint, destMint, priceFeed, maxStalenessSecs, maxSlippageBps): Promise<string>`

Configure an FX pair for cross-currency conversion.

#### `async removeFxPair(sourceMint, destMint): Promise<string>`

Remove an FX pair and reclaim rent.

#### `async convert(sourceMint, destMint, amount, minDestAmount): Promise<string>`

Convert tokens between stablecoins using the configured FX oracle.

### Metadata

#### `async updateMetadata(mint, uri): Promise<string>`

Update the metadata URI. Name and symbol are immutable.

---

## ComplianceModule API

Accessed via `treasury.compliance`.

### Blacklist

#### `async blacklistAdd(mint, address, reason): Promise<string>`

Add an address to the blacklist.

#### `async blacklistRemove(mint, address): Promise<string>`

Deactivate a blacklist entry.

#### `async blacklistClose(mint, address): Promise<string>`

Close a deactivated blacklist entry (reclaim rent).

#### `async isBlacklisted(mint, address): Promise<boolean>`

Check if an address is actively blacklisted.

### Seizure

#### `async seize(mint, sourceAccount, treasuryTokenAccount): Promise<string>`

Seize tokens from a blacklisted address.

#### `async seizeWithBlacklist(mint, sourceAccount, treasuryTokenAccount, blacklistedAddress): Promise<string>`

Seize tokens with an explicit blacklist entry PDA.

### Allowlist

#### `async allowlistAdd(mint, address): Promise<string>`

Add an address to the allowlist.

#### `async allowlistRemove(mint, address): Promise<string>`

Remove from the allowlist (closes account, reclaims rent).

#### `async isAllowlisted(mint, address): Promise<boolean>`

Check if an address is on the allowlist.

---

## KycModule API

Accessed via `treasury.kyc`. KYC entries are scoped to the treasury, not per-stablecoin.

#### `async approve(address, level, jurisdiction, provider, expiresAt): Promise<string>`

Approve KYC for an address.

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `PublicKey` | Wallet to approve |
| `level` | `KycLevel` | `Basic`, `Enhanced`, or `Institutional` |
| `jurisdiction` | `string` | 3-letter ISO code (e.g., "USA") |
| `provider` | `string` | KYC provider name |
| `expiresAt` | `BN \| number` | Unix timestamp, or 0 for no expiry |

#### `async revoke(address): Promise<string>`

Revoke KYC (deactivates, keeps account open).

#### `async close(address): Promise<string>`

Close a revoked KYC entry (reclaim rent).

#### `async getEntry(address): Promise<KycEntryAccount | null>`

Fetch a KYC entry. Returns null if not found.

#### `async isApproved(address): Promise<boolean>`

Check if an address has active, non-expired KYC.

---

## TravelRuleModule API

Accessed via `treasury.travelRule`.

#### `async attach(transferSig, mint, amount, originator, beneficiary): Promise<string>`

Attach a travel rule message. Uses the current authority as both originator and beneficiary account.

| Parameter | Type | Description |
|-----------|------|-------------|
| `transferSig` | `Uint8Array \| number[]` | 64-byte transaction signature |
| `mint` | `PublicKey` | Source stablecoin mint |
| `amount` | `BN \| number` | Transfer amount |
| `originator` | `{ name: string, vasp: string }` | Originator info |
| `beneficiary` | `{ name: string, vasp: string }` | Beneficiary info |

#### `async attachFull(transferSig, mint, amount, originatorAccount, beneficiaryAccount, originator, beneficiary): Promise<string>`

Attach with explicit originator and beneficiary account public keys.

#### `async close(transferSig): Promise<string>`

Close a travel rule message (reclaim rent).

#### `async getMessage(transferSig): Promise<TravelRuleMessageAccount | null>`

Fetch a travel rule message. Returns null if not found.

---

## PDA Helper Functions

All functions accept an optional `programId` parameter (defaults to `VIEX_TREASURY_PROGRAM_ID`).

```typescript
import {
  findTreasuryPDA,
  findStablecoinPDA,
  findRolePDA,
  findMinterInfoPDA,
  findBlacklistPDA,
  findAllowlistPDA,
  findKycPDA,
  findTravelRulePDA,
  findFxPairPDA,
  findOracleConfigPDA,
} from "@viex/sdk";
```

| Function | Seeds | Returns |
|----------|-------|---------|
| `findTreasuryPDA(authority)` | `["treasury", authority]` | `[PublicKey, number]` |
| `findStablecoinPDA(mint)` | `["stablecoin", mint]` | `[PublicKey, number]` |
| `findRolePDA(stablecoin, role, assignee)` | `["role", stablecoin, role, assignee]` | `[PublicKey, number]` |
| `findMinterInfoPDA(stablecoin, minter)` | `["minter_info", stablecoin, minter]` | `[PublicKey, number]` |
| `findBlacklistPDA(stablecoin, address)` | `["blacklist", stablecoin, address]` | `[PublicKey, number]` |
| `findAllowlistPDA(stablecoin, address)` | `["allowlist", stablecoin, address]` | `[PublicKey, number]` |
| `findKycPDA(treasury, address)` | `["kyc", treasury, address]` | `[PublicKey, number]` |
| `findTravelRulePDA(treasury, transferSig)` | `["travel_rule", treasury, sig]` | `[PublicKey, number]` |
| `findFxPairPDA(treasury, srcMint, dstMint)` | `["fx_pair", treasury, src, dst]` | `[PublicKey, number]` |
| `findOracleConfigPDA(stablecoin)` | `["oracle_config", stablecoin]` | `[PublicKey, number]` |
