# VIEX — Cross-Border Stablecoin Treasury

## StableHacks 2026 | Track 2: Cross-Border Stablecoin Treasury

**Deadline: March 29, 2026 (5 days)**

---

## Vision

A multi-currency institutional treasury platform on Solana where regulated entities can issue, manage, and transfer stablecoins across jurisdictions — with KYC gates, AML enforcement, Travel Rule compliance, FX conversion, and optional ZK-encrypted transfers — all enforced at the Token-2022 protocol level.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VIEX Treasury                         │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  VUSD     │  │  VEUR     │  │  VBRL     │  Mints    │
│  │  (USD)    │  │  (EUR)    │  │  (BRL)    │           │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │
│        │               │               │                │
│  ┌─────┴───────────────┴───────────────┴─────┐          │
│  │         Treasury Manager Program           │          │
│  │  - Multi-mint coordination                 │          │
│  │  - FX conversion (Pyth oracle rates)       │          │
│  │  - Cross-currency transfer routing         │          │
│  │  - Travel Rule message emission            │          │
│  │  - KYC registry (allowlist)                │          │
│  │  - AML enforcement (blacklist + seize)     │          │
│  └─────┬───────────────┬───────────────┬─────┘          │
│        │               │               │                │
│  ┌─────┴─────┐  ┌──────┴──────┐  ┌────┴──────┐         │
│  │ Transfer  │  │   Pyth      │  │  Compliance│         │
│  │ Hook      │  │   Oracle    │  │  Module    │         │
│  │ (per mint)│  │   FX Feeds  │  │  KYC/KYT  │         │
│  └───────────┘  └─────────────┘  └───────────┘         │
└─────────────────────────────────────────────────────────┘
```

---

## What We Fork From SSS

From `/Users/emmanuelosadebe/Downloads/curious/solana-stablecoin-standard`:

- **sss_token program** — Base for Treasury Manager (RBAC, mint/burn, freeze, pause, blacklist, seize, allowlist, oracle)
- **sss_transfer_hook** — Blacklist + allowlist enforcement on every transfer
- **TypeScript SDK** — SolanaStablecoin class, ComplianceModule, OracleModule, PDA helpers
- **CLI** — sss-token commands (rebrand to `viex`)
- **Backend** — Express API, event indexer, webhooks
- **Frontend** — React dashboard (rebrand + extend)

---

## What We Build New

### Phase 1: Core Treasury (Day 1-2)

1. **Treasury Account (on-chain)**
   - New `Treasury` PDA that tracks multiple mints under one authority
   - Supported currencies list, FX oracle feeds per pair
   - Treasury-wide compliance settings

2. **FX Conversion Instruction**
   - `convert(amount, source_mint, dest_mint)`
   - Burns source stablecoin, mints destination at Pyth FX rate
   - Enforces max slippage, oracle staleness
   - Emits `CurrencyConverted` event with rate, amount, pair

3. **Multi-Currency Init**
   - `init-treasury` command that deploys USD + EUR + BRL mints in one flow
   - Each mint is SSS-2 (compliant) or SSS-3 (private) preset
   - Shared authority, shared compliance config

### Phase 2: Compliance Layer (Day 2-3)

4. **Travel Rule Module**
   - `TravelRuleMessage` account (PDA per transfer above threshold)
   - Fields: originator_name, originator_vasp, beneficiary_name, beneficiary_vasp, amount, currency, purpose
   - `attach_travel_rule(transfer_sig, message)` instruction
   - Threshold configurable per jurisdiction (e.g., $3000 FATF, $1000 US)
   - Events: `TravelRuleAttached`, `TravelRuleUpdated`

5. **KYC Registry**
   - Reframe SSS-3 allowlist as KYC registry
   - Add `KycEntry` account extending AllowlistEntry with:
     - kyc_level (1=basic, 2=enhanced, 3=institutional)
     - jurisdiction (ISO country code)
     - expiry timestamp
     - provider (who verified)
   - Transfer hook checks KYC level + expiry
   - `kyc approve/revoke/check` CLI commands

6. **KYT Integration**
   - Webhook event types for transaction screening
   - Backend endpoint: POST /api/v1/kyt/screen (calls external provider)
   - Auto-flag high-risk transfers for manual review
   - Risk score tracking per address

### Phase 3: Frontend + Demo (Day 3-4)

7. **Treasury Dashboard**
   - Multi-currency overview (balances per mint, total USD value)
   - FX conversion UI with live rates
   - Cross-border transfer flow with Travel Rule form
   - KYC management panel
   - Compliance alerts feed

8. **Devnet Deployment + Demo Script**
   - Deploy all programs to devnet
   - Automated demo: init treasury → mint USD/EUR → KYC users → transfer → convert USD→EUR → Travel Rule → blacklist → seize → audit trail
   - Record technical walkthrough (2 min)

### Phase 4: Polish + Submit (Day 4-5)

9. **Videos**
   - Technical walkthrough (2 min): show devnet demo, architecture, code
   - Pitch video (2-3 min): problem, vision, solution, differentiators, team

10. **Documentation**
    - Update README for VIEX branding
    - Architecture diagram
    - Compliance mapping (KYC/KYT/AML/Travel Rule)

---

## Tech Stack

- **On-chain**: Anchor/Rust, Token-2022, Pyth Oracle
- **SDK**: TypeScript, @solana/web3.js, @solana/spl-token
- **CLI**: TypeScript, Commander
- **Backend**: Express, webhooks, NDJSON event store
- **Frontend**: React, Vite, Tailwind, Solana Wallet Adapter
- **Testing**: Anchor tests, SDK unit tests, CLI smoke tests

---

## Judging Criteria Mapping

| Criteria | How We Score |
|----------|-------------|
| **Team Execution & Technical Readiness** | Working MVP on devnet, 225+ tests inherited, CI pipeline |
| **Institutional Fit & Compliance Awareness** | KYC registry, AML blacklist/seize, Travel Rule, GENIUS Act mapping |
| **Stablecoin Infrastructure Innovativeness** | Multi-currency FX conversion, ZK-encrypted transfers (SSS-3), on-chain oracle enforcement |
| **Scalability & Adoption Potential** | Modular SDK (fork and customize), any currency supported via Pyth feeds |
| **Submission Clarity & Completeness** | 2 videos, full docs, live devnet demo, public GitHub |

---

## File Structure

```
viex/
├── programs/
│   ├── viex-treasury/          # Treasury manager program (extends sss-token)
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── state.rs        # Treasury, KycEntry, TravelRuleMessage
│   │       ├── instructions/
│   │       │   ├── init_treasury.rs
│   │       │   ├── convert.rs          # FX conversion
│   │       │   ├── travel_rule.rs      # Travel Rule attachment
│   │       │   ├── kyc.rs              # KYC approve/revoke
│   │       │   └── mod.rs
│   │       ├── events.rs
│   │       ├── errors.rs
│   │       └── constants.rs
│   └── transfer-hook/          # Fork of sss_transfer_hook (+ KYC checks)
├── sdk/
│   └── core/
│       └── src/
│           ├── index.ts
│           ├── treasury.ts     # Treasury class
│           ├── convert.ts      # FX conversion helpers
│           ├── travel-rule.ts  # Travel Rule module
│           ├── kyc.ts          # KYC module
│           └── compliance.ts   # Inherited from SSS
├── cli/
│   └── src/
│       └── commands/
│           ├── treasury.ts     # init-treasury, status
│           ├── convert.ts      # FX conversion
│           ├── travel-rule.ts  # attach/query
│           ├── kyc.ts          # approve/revoke/check
│           └── ...             # inherited SSS commands
├── backend/
│   └── src/
│       ├── app.ts              # Extended API
│       └── kyt.ts              # KYT screening service
├── frontend/
│   └── src/
│       └── pages/
│           ├── TreasuryDashboard.tsx
│           ├── Convert.tsx
│           ├── TravelRule.tsx
│           ├── KycManagement.tsx
│           └── ...
├── tests/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── COMPLIANCE.md           # KYC/KYT/AML/Travel Rule mapping
│   ├── SDK.md
│   └── API.md
├── scripts/
│   └── demo.sh                 # Automated devnet demo
├── Anchor.toml
├── Cargo.toml
├── package.json
└── README.md
```

---

## Timeline

| Day | Focus | Deliverable |
|-----|-------|-------------|
| **Day 1 (Mar 24)** | Scaffold + Treasury program + FX conversion | Compiling programs, init-treasury working |
| **Day 2 (Mar 25)** | Travel Rule + KYC registry on-chain | All new instructions working on localnet |
| **Day 3 (Mar 26)** | SDK + CLI + Backend extensions | Full stack working, devnet deploy |
| **Day 4 (Mar 27)** | Frontend dashboard + Demo script | Treasury dashboard live, demo recorded |
| **Day 5 (Mar 28)** | Videos + Polish + Submit | Both videos done, DoraHacks submission |
| **Buffer (Mar 29)** | Last-minute fixes | Deadline 22:00 UTC |

---

## Status

- [ ] Scaffold project from SSS
- [ ] Treasury Manager program
- [ ] FX Conversion instruction
- [ ] Travel Rule module
- [ ] KYC Registry
- [ ] Transfer hook with KYC checks
- [ ] SDK extensions
- [ ] CLI extensions
- [ ] Backend KYT endpoint
- [ ] Frontend treasury dashboard
- [ ] Devnet deployment
- [ ] Demo script
- [ ] Technical walkthrough video (2 min)
- [ ] Pitch video (2-3 min)
- [ ] DoraHacks submission
