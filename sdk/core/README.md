# viex-sdk

Cross-Border Stablecoin Treasury SDK for Solana.

Multi-currency treasury management with on-chain KYC, AML blacklists, Travel Rule compliance, FX conversion, and rent reclamation — all enforced at the Token-2022 transfer hook level.

## Install

```bash
npm install viex-sdk
```

## Quick Start

```typescript
import { ViexTreasury, Presets } from "viex-sdk";

// Create a treasury
const treasury = await ViexTreasury.createTreasury(
  connection, authority, "My Treasury", "USD"
);

// Create a compliant stablecoin (SSS-2)
const { mint } = await treasury.initStablecoin(
  "My USD", "MUSD", "https://example.com/metadata.json",
  6, Presets.compliance()
);

// Mint tokens
await treasury.mint(mint, recipient, 1_000_000);

// Compliance operations
await treasury.compliance.blacklistAdd(mint, badActor, "OFAC match");
await treasury.compliance.seize(mint, badActorAta, treasuryAta);

// KYC management
await treasury.kyc.approve(address, KycLevel.Enhanced, "USA", "Sumsub", 0);

// Travel Rule
await treasury.travelRule.attach(txSig, mint, amount, originator, beneficiary);
```

## Features

- **Multi-currency treasury** — manage USD, EUR, BRL mints under one authority
- **KYC registry** — 3 levels, jurisdiction tracking, expiry, enforced by transfer hook
- **AML blacklist** — add/remove/close with rent reclaim, enforced on every transfer
- **Travel Rule** — FATF-compliant originator/beneficiary VASP data
- **FX conversion** — burn source, mint dest at Pyth oracle rate
- **5-role RBAC** — Minter, Burner, Pauser, Blacklister, Seizer
- **Rent reclamation** — 6 close instructions for resolved compliance records
- **Two-step authority transfer** — nominate then accept

## Programs (Devnet)

| Program | Address |
|---------|---------|
| viex_treasury | `3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU` |
| viex_transfer_hook | `4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY` |

## License

MIT
