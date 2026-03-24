# viex-sdk

Cross-Border Stablecoin Treasury SDK for Solana.

Multi-currency treasury management with on-chain KYC, AML blacklists, Travel Rule compliance, FX conversion, and rent reclamation — all enforced at the Token-2022 transfer hook level.

## Install

```bash
npm install viex-sdk
```

## Exports

```typescript
// Classes
import { ViexTreasury, ComplianceModule, KycModule, TravelRuleModule } from "viex-sdk";

// Enums & Presets
import { Role, KycLevel, Presets } from "viex-sdk";

// PDA Helpers
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
} from "viex-sdk";

// Constants
import { VIEX_TREASURY_PROGRAM_ID, VIEX_TRANSFER_HOOK_PROGRAM_ID } from "viex-sdk";

// Helpers
import { roleToAnchor, roleToSeedString, kycLevelToU8 } from "viex-sdk";
```

## Quick Start

### 1. Create a Treasury

```typescript
import { ViexTreasury, Presets, KycLevel } from "viex-sdk";
import { Connection, Keypair } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = new Wallet(Keypair.fromSecretKey(/* ... */));
const provider = new AnchorProvider(connection, wallet, {});

const treasury = await ViexTreasury.createTreasury(
  connection,
  wallet.publicKey,
  "Acme Treasury",
  "USD",
  { travelRuleThreshold: 3_000_000_000, kycRequired: true }
);
```

### 2. Create a Stablecoin

```typescript
// SSS-1: Minimal (no compliance)
const { mint } = await treasury.initStablecoin(
  "Acme USD", "AUSD", "https://example.com/metadata.json",
  6, Presets.basic()
);

// SSS-2: Compliant (blacklist + seize + transfer hook)
const { mint } = await treasury.initStablecoin(
  "Acme USD", "AUSD", "https://example.com/metadata.json",
  6, Presets.compliance()
);
```

### 3. Mint & Burn

```typescript
await treasury.mint(mint, recipientPubkey, 1_000_000_000); // 1000 tokens (6 decimals)
await treasury.burn(mint, 500_000_000);
```

### 4. Role Management

```typescript
import { Role } from "viex-sdk";

await treasury.assignRole(mint, Role.Minter, minterPubkey);
await treasury.assignRole(mint, Role.Blacklister, compliancePubkey);
await treasury.revokeRole(mint, Role.Minter, minterPubkey);
await treasury.closeRole(mint, Role.Minter, minterPubkey); // reclaim rent
```

### 5. Compliance (Blacklist & Seize)

```typescript
// Blacklist
await treasury.compliance.blacklistAdd(mint, badActor, "OFAC SDN match");
const isBlacklisted = await treasury.compliance.isBlacklisted(mint, badActor);

// Seize tokens from blacklisted account
await treasury.compliance.seize(mint, badActorTokenAccount, treasuryTokenAccount);

// Remove and reclaim rent
await treasury.compliance.blacklistRemove(mint, badActor);
await treasury.compliance.blacklistClose(mint, badActor); // SOL returned
```

### 6. KYC Registry

```typescript
import { KycLevel } from "viex-sdk";

// Approve KYC (level 1-3, jurisdiction, provider, expiry)
await treasury.kyc.approve(
  userPubkey,
  KycLevel.Enhanced,     // Level 2
  "USA",                 // ISO 3166-1 alpha-3
  "Sumsub",              // KYC provider
  0                      // 0 = never expires
);

// Check status
const entry = await treasury.kyc.getEntry(userPubkey);
const isApproved = await treasury.kyc.isApproved(userPubkey);

// Revoke and reclaim rent
await treasury.kyc.revoke(userPubkey);
await treasury.kyc.close(userPubkey); // SOL returned
```

### 7. Travel Rule

```typescript
// Attach FATF-compliant data to a transfer
await treasury.travelRule.attach(
  transferSignatureBytes,  // 64-byte tx signature
  mint,
  5_000_000_000,           // amount
  {
    name: "Alice Corp",
    vasp: "VASP-001",
    account: originatorPubkey,
  },
  {
    name: "Bob Inc",
    vasp: "VASP-002",
    account: beneficiaryPubkey,
  }
);

// Close and reclaim rent
await treasury.travelRule.close(signatureBytes);
```

### 8. PDA Helpers

```typescript
import { findTreasuryPDA, findStablecoinPDA, findKycPDA } from "viex-sdk";

const [treasuryPda] = findTreasuryPDA(authorityPubkey);
const [stablecoinPda] = findStablecoinPDA(mintPubkey);
const [kycPda] = findKycPDA(treasuryPda, userPubkey);
```

### 9. Freeze / Thaw / Pause

```typescript
await treasury.freeze(mint, tokenAccountPubkey);
await treasury.thaw(mint, tokenAccountPubkey);
await treasury.pause(mint);
await treasury.unpause(mint);
```

### 10. Authority Transfer

```typescript
// Two-step (safe)
await treasury.nominateAuthority(mint, newAuthorityPubkey);
// New authority signs:
await treasury.acceptAuthority(mint);

// Single-step (use with caution)
await treasury.transferAuthority(mint, newAuthorityPubkey);
```

## Presets

| Preset | Method | Extensions |
|--------|--------|------------|
| SSS-1 Minimal | `Presets.basic()` | Metadata only |
| SSS-2 Compliant | `Presets.compliance()` | + Permanent delegate, Transfer hook, Default frozen |
| SSS-3 Private | Custom config | + Allowlist (KYC gate), Confidential transfer |

## Rent Reclamation

All compliance accounts support rent reclaim after deactivation:

```typescript
await treasury.compliance.blacklistClose(mint, address);  // after remove
await treasury.closeRole(mint, role, address);             // after revoke
await treasury.kyc.close(address);                         // after revoke
await treasury.travelRule.close(sigBytes);                 // anytime
```

## Programs (Devnet)

| Program | Address |
|---------|---------|
| viex_treasury | `3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU` |
| viex_transfer_hook | `4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY` |

## Links

- **GitHub**: https://github.com/Nuel-osas/viex
- **Frontend**: https://viex-three.vercel.app
- **npm**: https://www.npmjs.com/package/viex-sdk

## License

MIT
