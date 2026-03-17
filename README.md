# VIEX — Cross-Border Stablecoin Treasury

**StableHacks 2026 | Track 2: Cross-Border Stablecoin Treasury**

A multi-currency institutional treasury platform on Solana where regulated entities can issue, manage, and transfer stablecoins across jurisdictions — with KYC gates, AML enforcement, Travel Rule compliance, FX conversion, and on-chain audit trails — all enforced at the Token-2022 protocol level.

## Architecture

```
                          VIEX Treasury
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  │  ┌────────┐   ┌────────┐   ┌────────┐           │
  │  │  VUSD  │   │  VEUR  │   │  VBRL  │  Mints    │
  │  └───┬────┘   └───┬────┘   └───┬────┘           │
  │      │            │            │                 │
  │  ┌───┴────────────┴────────────┴───┐             │
  │  │     Treasury Manager Program     │             │
  │  │  - Multi-mint coordination       │             │
  │  │  - FX conversion (Pyth oracle)   │             │
  │  │  - KYC registry                  │             │
  │  │  - Travel Rule compliance        │             │
  │  │  - AML enforcement (blacklist)   │             │
  │  │  - Role-based access control     │             │
  │  │  - Rent reclamation              │             │
  │  └───┬────────────┬────────────┬───┘             │
  │      │            │            │                 │
  │  ┌───┴───┐  ┌─────┴─────┐  ┌──┴──────┐          │
  │  │ Hook  │  │   Pyth    │  │  KYC /  │          │
  │  │(AML)  │  │   Oracle  │  │  Travel │          │
  │  └───────┘  └───────────┘  │  Rule   │          │
  │                            └─────────┘          │
  └──────────────────────────────────────────────────┘
```

## Hackathon Compliance Prerequisites

| Requirement | Implementation |
|-------------|---------------|
| **KYC** | On-chain KYC registry with 3 levels (Basic/Enhanced/Institutional), jurisdiction tracking, provider, and expiry. Transfer hook enforces allowlist (KYC gate) on every transfer. |
| **KYT** | Full audit trail via on-chain events. Backend webhook system for real-time transaction screening. Every state change emits a timestamped event. |
| **AML** | Blacklist enforcement at Token-2022 transfer hook level. Permanent delegate seizure. Freeze/thaw. Role separation (Blacklister, Seizer, Pauser). |
| **Travel Rule** | On-chain TravelRuleMessage accounts storing originator/beneficiary VASP info. Configurable threshold per treasury. SHA-256 signature linking. |

## Programs (Deployed to Devnet)

| Program | Address |
|---------|---------|
| **viex_treasury** | `3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU` |
| **viex_transfer_hook** | `4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY` |

### 33 On-Chain Instructions

**Treasury Management:**
- `init_treasury` — Create multi-currency treasury with configurable travel rule threshold and KYC requirement
- `register_mint` — Register stablecoin mints under the treasury
- `initialize` — Create stablecoin with preset (SSS-1 minimal / SSS-2 compliant / SSS-3 private)

**Core Operations:**
- `mint_tokens` — Mint with RBAC, per-minter quotas, supply cap, oracle peg enforcement
- `burn_tokens` — Burn with role validation and oracle enforcement
- `freeze_account` / `thaw_account` — Individual account freeze/thaw
- `pause` / `unpause` — Global circuit breaker

**Role-Based Access Control:**
- `assign_role` / `revoke_role` / `close_role` — 5 roles: Minter, Burner, Pauser, Blacklister, Seizer
- `set_supply_cap` / `update_minter_quota` — On-chain enforceable limits
- `nominate_authority` / `accept_authority` / `transfer_authority` — Two-step authority transfer

**Compliance (AML):**
- `add_to_blacklist` / `remove_from_blacklist` / `close_blacklist_entry` — Deactivation preserves audit trail, close reclaims rent
- `seize` — Permanent delegate token seizure from blacklisted accounts
- `add_to_allowlist` / `remove_from_allowlist` — Permissioned transfer gates

**KYC Registry:**
- `kyc_approve` — Approve with level (1-3), ISO jurisdiction, provider, expiry
- `kyc_revoke` / `kyc_close` — Revoke then reclaim rent

**Travel Rule:**
- `attach_travel_rule` — FATF-compliant originator/beneficiary VASP data
- `close_travel_rule` — Reclaim rent after retention period

**FX Conversion:**
- `convert` — Burn source stablecoin, mint destination at Pyth oracle FX rate with slippage protection
- `configure_fx_pair` / `remove_fx_pair` — Per-pair oracle configuration with staleness and slippage limits

**Oracle:**
- `configure_oracle` — Pyth v2 price feed for peg enforcement on mint/burn
- `update_metadata` — URI-only updates (name/symbol immutable for wallet safety)

### Transfer Hook

Every Token-2022 transfer is intercepted by the transfer hook program which:
1. Checks sender and recipient against on-chain blacklist PDAs
2. If allowlist is enabled (SSS-3), verifies both parties are on the allowlist (KYC gate)
3. Bypasses checks for permanent delegate seizure operations (compliance actions can't block themselves)

## Rent Reclamation

All compliance and registry accounts support rent reclaim after deactivation:

| Account Type | Close Instruction | Guard |
|-------------|-------------------|-------|
| BlacklistEntry | `close_blacklist_entry` | Must be deactivated first |
| RoleAssignment | `close_role` | Must be revoked first |
| KycEntry | `kyc_close` | Must be revoked first |
| TravelRuleMessage | `close_travel_rule` | Treasury authority only |
| FxPairConfig | `remove_fx_pair` | Treasury authority only |
| AllowlistEntry | `remove_from_allowlist` | Closes on removal |

## Deliverables

| Component | Stack | Description |
|-----------|-------|-------------|
| **On-chain programs** | Anchor/Rust | `viex_treasury` (33 ix) + `viex_transfer_hook`, deployed to devnet |
| **TypeScript SDK** | `sdk/core/` | `ViexTreasury` class, `ComplianceModule`, `KycModule`, `TravelRuleModule`, PDA helpers |
| **CLI** | `cli/` | 40+ commands: treasury, mint, burn, roles, blacklist, seize, kyc, travel-rule, fx, oracle, authority |
| **Frontend** | `frontend/` (React + Vite + Tailwind) | 12-page admin dashboard with wallet integration |
| **Tests** | `tests/` | 53 integration tests covering all instructions including rent reclamation |

## Three Stablecoin Presets

| Preset | Description | Token-2022 Extensions |
|--------|-------------|----------------------|
| **SSS-1** | Minimal | Metadata pointer only |
| **SSS-2** | Compliant | + Permanent delegate, Transfer hook, Default frozen |
| **SSS-3** | Private | + Allowlist (KYC gate), Confidential transfer mint |

## Test Coverage (53 Tests)

```
Compliance Tests (15):
  ✔ Blacklist add/remove/close with rent reclaim
  ✔ Reject closing active entries (AccountStillActive)
  ✔ Seize tokens from blacklisted account
  ✔ Allowlist add/remove with rent reclaim
  ✔ Role assign/revoke/close with rent reclaim
  ✔ Unauthorized access rejection

Cross-Border Tests (15):
  ✔ FX pair configuration
  ✔ KYC approve/revoke/close with rent reclaim
  ✔ Travel rule attach/close with rent reclaim
  ✔ FX pair removal with rent reclaim
  ✔ Two-step authority transfer (nominate + accept)
  ✔ Single-step authority transfer
  ✔ Metadata URI update

Treasury + Multi-Currency Tests (23):
  ✔ Treasury initialization
  ✔ SSS-1 and SSS-2 stablecoin creation
  ✔ Multi-mint registration
  ✔ Duplicate mint rejection
  ✔ 5-role RBAC assignment
  ✔ Mint/burn with role validation
  ✔ Freeze/thaw, pause/unpause
  ✔ Supply cap enforcement
  ✔ Per-minter quota enforcement
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/<repo>
cd viex
npm install

# Build programs
anchor build

# Run tests (53 tests, all passing)
anchor test

# CLI usage
cd cli && npm install && npm link
viex init-treasury --name "Acme Treasury" --base-currency USD --kyc-required
viex init sss-2 --name "Acme USD" --symbol AUSD --decimals 6
viex register-mint --mint <MINT_ADDRESS>
viex roles assign --mint <MINT> --role minter --address <WALLET>
viex mint --mint <MINT> --to <RECIPIENT> --amount 1000
viex kyc approve --address <WALLET> --level 2 --jurisdiction USA --provider Sumsub
viex blacklist add --mint <MINT> --address <BAD_ACTOR> --reason "OFAC SDN match"
viex seize --mint <MINT> --from <TOKEN_ACCOUNT> --to <TREASURY_ACCOUNT>

# Frontend
cd frontend && npm install && npm run dev
```

## Why This Matters

1. **GENIUS Act compliance** — KYC registry, AML blacklist/seizure, Travel Rule data, and audit trails are mandatory for regulated stablecoin issuers.

2. **Multi-currency treasury** — Institutions operating across jurisdictions need USD, EUR, BRL stablecoins under one authority with FX conversion. VIEX coordinates multiple mints with shared compliance infrastructure.

3. **On-chain enforcement** — Transfer hooks ensure compliance cannot be bypassed. No wallet, DEX, or protocol can move tokens without passing blacklist and KYC checks. This is the same pattern PYUSD and USDP use in production.

4. **Rent efficiency** — All compliance accounts support rent reclamation after deactivation. Operators don't pay permanent storage costs for resolved entries.

5. **Institutional privacy** — SSS-3 preset supports confidential transfers with allowlist enforcement for permissioned institutional networks.

## Tech Stack

- **On-chain**: Solana, Token-2022, Anchor 0.31.1 (Rust)
- **Oracle**: Pyth v2 (raw binary parsing, no borsh conflicts)
- **SDK**: TypeScript, @coral-xyz/anchor, @solana/web3.js
- **CLI**: TypeScript, Commander.js, chalk
- **Frontend**: React, Vite, Tailwind CSS, Solana Wallet Adapter
- **Testing**: Anchor integration tests (ts-mocha)

## Security

- PDA-based authority (no single EOA controls sensitive operations)
- Immutable compliance config (SSS preset flags locked at initialization)
- Two-step authority transfer (prevents accidental loss)
- Per-minter quotas enforced on-chain
- Transfer hook fail-closed design
- `security_txt!` macro embedded in both programs
- Blacklist deactivation preserves audit trail (entries never deleted)

## License

MIT
