# VIEX Architecture

## Overview

VIEX is a multi-currency institutional treasury platform on Solana where regulated entities issue, manage, and transfer stablecoins across jurisdictions. Compliance is enforced at the Token-2022 protocol level through transfer hooks, PDA-based access control, and immutable configuration flags.

## Programs

| Program | ID | Purpose |
|---------|-----|---------|
| `viex_treasury` | `3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU` | 33 instructions: treasury management, stablecoin lifecycle, RBAC, compliance, KYC, travel rule, FX conversion, oracle |
| `viex_transfer_hook` | `4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY` | Intercepts every Token-2022 transfer to enforce blacklist and allowlist (KYC gate) checks |

---

## Three-Layer Model

```
┌─────────────────────────────────────────────────────┐
│                    PRESETS                            │
│  SSS-1 (Minimal)  SSS-2 (Compliant)  SSS-3 (Private)│
│  One-line config   One-line config    One-line config │
└────────────────────────┬────────────────────────────┘
                         │ uses
┌────────────────────────▼────────────────────────────┐
│                    MODULES                           │
│  ComplianceModule   KycModule   TravelRuleModule     │
│  (blacklist/seize)  (KYC reg)  (FATF messages)       │
└────────────────────────┬────────────────────────────┘
                         │ wraps
┌────────────────────────▼────────────────────────────┐
│                    BASE SDK                          │
│  ViexTreasury class                                  │
│  - Treasury CRUD                                     │
│  - Stablecoin init/register                          │
│  - Mint/burn/freeze/thaw/pause                       │
│  - Role management                                   │
│  - Authority transfer                                │
│  - Oracle + FX pair config                           │
│  - FX conversion                                     │
│  - PDA helpers                                       │
└─────────────────────────────────────────────────────┘
```

**Presets** are thin configuration objects (`StablecoinInitConfig`) that set boolean flags controlling which Token-2022 extensions are enabled at mint creation time. Once set, these flags are immutable.

**Modules** provide domain-specific APIs (compliance, KYC, travel rule) that compose the base program instructions with correct PDA derivation and account resolution.

**Base SDK** (`ViexTreasury` class) provides direct access to all 33 on-chain instructions through typed methods, automatic PDA derivation, and Anchor program interaction.

---

## On-Chain Account Layout

### Treasury

The root account that coordinates multiple stablecoin mints under one authority.

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | Owner of the treasury |
| `name` | `String` (max 32) | Display name |
| `mints` | `Vec<Pubkey>` (max 10) | Registered stablecoin mints |
| `base_currency` | `String` (max 10) | Base currency code (e.g., "USD") |
| `travel_rule_threshold` | `u64` | Amount above which travel rule data is required |
| `kyc_required` | `bool` | Whether KYC is enforced for minting |
| `created_at` | `i64` | Unix timestamp |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["treasury", authority]`

---

### Stablecoin

Per-mint configuration linked to a parent treasury.

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `Pubkey` | Current authority |
| `mint` | `Pubkey` | Token-2022 mint address |
| `treasury` | `Pubkey` | Parent treasury PDA |
| `name` | `String` (max 32) | Display name |
| `symbol` | `String` (max 10) | Token symbol |
| `uri` | `String` (max 200) | Metadata URI |
| `decimals` | `u8` | Token decimals |
| `paused` | `bool` | Global pause flag |
| `enable_permanent_delegate` | `bool` | Immutable: seizure support |
| `enable_transfer_hook` | `bool` | Immutable: blacklist enforcement |
| `enable_allowlist` | `bool` | Immutable: KYC gate |
| `total_minted` | `u64` | Cumulative minted |
| `total_burned` | `u64` | Cumulative burned |
| `supply_cap` | `u64` | Max supply (0 = unlimited) |
| `pending_authority` | `Option<Pubkey>` | Two-step authority transfer |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["stablecoin", mint]`

---

### RoleAssignment

Maps a role to an assignee for a specific stablecoin.

| Field | Type | Description |
|-------|------|-------------|
| `stablecoin` | `Pubkey` | Stablecoin PDA |
| `role` | `Role` | One of: Minter, Burner, Blacklister, Pauser, Seizer |
| `assignee` | `Pubkey` | Wallet with this role |
| `active` | `bool` | Whether currently active |
| `granted_by` | `Pubkey` | Who assigned the role |
| `granted_at` | `i64` | When assigned |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["role", stablecoin, role_seed, assignee]`

Where `role_seed` is one of: `"minter"`, `"burner"`, `"blacklister"`, `"pauser"`, `"seizer"`.

---

### MinterInfo

Per-minter quota tracking.

| Field | Type | Description |
|-------|------|-------------|
| `stablecoin` | `Pubkey` | Stablecoin PDA |
| `minter` | `Pubkey` | Minter wallet |
| `quota` | `u64` | Max allowed to mint |
| `minted` | `u64` | Amount minted so far |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["minter_info", stablecoin, minter]`

---

### BlacklistEntry

Per-address blacklist for a stablecoin.

| Field | Type | Description |
|-------|------|-------------|
| `stablecoin` | `Pubkey` | Stablecoin PDA |
| `address` | `Pubkey` | Blacklisted wallet |
| `reason` | `String` (max 128) | Reason for blacklisting |
| `active` | `bool` | Currently enforced |
| `blacklisted_at` | `i64` | When blacklisted |
| `blacklisted_by` | `Pubkey` | Who blacklisted |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["blacklist", stablecoin, address]`

---

### AllowlistEntry

Per-address allowlist for SSS-3 stablecoins (KYC gate).

| Field | Type | Description |
|-------|------|-------------|
| `stablecoin` | `Pubkey` | Stablecoin PDA |
| `address` | `Pubkey` | Allowed wallet |
| `added_at` | `i64` | When added |
| `added_by` | `Pubkey` | Who added |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["allowlist", stablecoin, address]`

---

### KycEntry

KYC approval scoped to the treasury (not per-stablecoin).

| Field | Type | Description |
|-------|------|-------------|
| `treasury` | `Pubkey` | Treasury PDA |
| `address` | `Pubkey` | KYC-approved wallet |
| `kyc_level` | `KycLevel` | Basic (1), Enhanced (2), Institutional (3) |
| `jurisdiction` | `[u8; 3]` | ISO 3166-1 alpha-3 code |
| `provider` | `String` (max 32) | Who performed verification |
| `approved_at` | `i64` | When approved |
| `expires_at` | `i64` | Expiry timestamp (0 = never) |
| `approved_by` | `Pubkey` | Who approved |
| `active` | `bool` | Currently active |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["kyc", treasury, address]`

---

### TravelRuleMessage

FATF-compliant originator/beneficiary data attached to transfers.

| Field | Type | Description |
|-------|------|-------------|
| `treasury` | `Pubkey` | Treasury PDA |
| `transfer_signature` | `[u8; 64]` | Transaction signature of the transfer |
| `source_mint` | `Pubkey` | Stablecoin mint used |
| `amount` | `u64` | Transfer amount |
| `originator_name` | `String` (max 64) | Originator legal name |
| `originator_vasp` | `String` (max 64) | Originator VASP identifier |
| `originator_account` | `Pubkey` | Originator wallet |
| `beneficiary_name` | `String` (max 64) | Beneficiary legal name |
| `beneficiary_vasp` | `String` (max 64) | Beneficiary VASP identifier |
| `beneficiary_account` | `Pubkey` | Beneficiary wallet |
| `created_at` | `i64` | When created |
| `created_by` | `Pubkey` | Who attached |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["travel_rule", treasury, SHA256(transfer_signature)]`

---

### FxPairConfig

Per-pair oracle configuration for cross-currency conversion.

| Field | Type | Description |
|-------|------|-------------|
| `treasury` | `Pubkey` | Treasury PDA |
| `source_mint` | `Pubkey` | Source stablecoin mint |
| `dest_mint` | `Pubkey` | Destination stablecoin mint |
| `price_feed` | `Pubkey` | Pyth price feed account |
| `max_staleness_secs` | `u64` | Max oracle staleness |
| `max_slippage_bps` | `u16` | Max allowed slippage in basis points |
| `enabled` | `bool` | Whether conversion is active |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["fx_pair", treasury, source_mint, dest_mint]`

---

### OracleConfig

Per-stablecoin oracle for peg enforcement on mint/burn.

| Field | Type | Description |
|-------|------|-------------|
| `stablecoin` | `Pubkey` | Stablecoin PDA |
| `price_feed` | `Pubkey` | Pyth price feed account |
| `max_deviation_bps` | `u16` | Max allowed peg deviation |
| `max_staleness_secs` | `u64` | Max oracle staleness |
| `enabled` | `bool` | Whether oracle enforcement is active |
| `bump` | `u8` | PDA bump |

**PDA seeds:** `["oracle_config", stablecoin]`

---

## Data Flow Diagrams

### Mint Flow

```
User (Minter role)
  │
  ▼
mint_tokens instruction
  │
  ├── Check: role active?           ──▶ RoleAssignment PDA
  ├── Check: stablecoin paused?     ──▶ Stablecoin PDA
  ├── Check: minter quota?          ──▶ MinterInfo PDA
  ├── Check: supply cap?            ──▶ Stablecoin PDA
  ├── Check: oracle peg? (if set)   ──▶ OracleConfig PDA ──▶ Pyth feed
  │
  ▼
Token-2022 mint_to CPI
  │
  ▼
Stablecoin.total_minted += amount
MinterInfo.minted += amount
Emit TokensMinted event
```

### Transfer Flow (with Transfer Hook)

```
User sends Token-2022 transfer
  │
  ▼
Token-2022 program
  │
  ├── Normal transfer logic
  │
  ▼
Transfer Hook (viex_transfer_hook)
  │
  ├── Is this a permanent-delegate seizure?
  │     Yes ──▶ SKIP all checks (compliance can't block itself)
  │     No  ──▼
  │
  ├── Check source blacklist PDA ──▶ if active → REJECT
  ├── Check dest blacklist PDA   ──▶ if active → REJECT
  │
  ├── Is allowlist enabled? (read Stablecoin.enable_allowlist)
  │     No  ──▶ PASS
  │     Yes ──▼
  │
  ├── Check source allowlist PDA ──▶ if missing → REJECT
  ├── Check dest allowlist PDA   ──▶ if missing → REJECT
  │
  ▼
Transfer approved
```

### OFAC Seizure Flow

```
OFAC SDN match detected
  │
  ▼
Blacklister adds address to blacklist
  │  └── BlacklistEntry PDA created (active=true)
  │
  ▼
All transfers blocked (transfer hook rejects)
  │
  ▼
Pauser freezes the token account
  │
  ▼
Seizer seizes tokens via permanent delegate
  │  └── Tokens moved from target → treasury account
  │
  ▼
Burner burns seized tokens
  │
  ▼
Authority re-mints to lawful claimant (if applicable)
```

### FX Conversion Flow

```
User holds VUSD, wants VEUR
  │
  ▼
convert instruction
  │
  ├── Fetch FxPairConfig PDA (VUSD→VEUR)
  ├── Read Pyth price feed for EUR/USD
  ├── Check staleness
  ├── Calculate dest_amount = source_amount * fx_rate
  ├── Check slippage vs min_dest_amount
  │
  ├── Burn source_amount VUSD (via burn CPI)
  ├── Mint dest_amount VEUR (via mint CPI)
  │
  ▼
Emit CurrencyConverted event
```

---

## Security Model

### PDA Authority

No single EOA (externally owned account) controls sensitive operations. The Stablecoin PDA serves as the mint authority, freeze authority, and permanent delegate. All operations require the PDA to sign via `seeds` and `bump`. This means:

- The mint authority cannot be transferred to an arbitrary wallet
- The freeze authority cannot be changed to bypass compliance
- The permanent delegate (seizure authority) is always the program-controlled PDA

### Role Separation

Five distinct roles prevent any single key from performing all sensitive operations:

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **Minter** | `mint_tokens` | Burn, blacklist, seize, pause |
| **Burner** | `burn_tokens` | Mint, blacklist, seize, pause |
| **Blacklister** | `add_to_blacklist`, `remove_from_blacklist`, `close_blacklist_entry` | Mint, burn, seize, pause |
| **Pauser** | `pause`, `unpause`, `freeze_account`, `thaw_account` | Mint, burn, blacklist, seize |
| **Seizer** | `seize` | Mint, burn, blacklist, pause |

Only the **authority** (treasury owner) can assign/revoke roles, manage KYC entries, attach travel rule data, configure oracles, and transfer authority.

### Immutable Compliance Config

When a stablecoin is initialized, the following flags are set permanently:

- `enable_permanent_delegate` -- cannot be turned off later
- `enable_transfer_hook` -- cannot be turned off later
- `enable_allowlist` -- cannot be turned off later

This ensures that a stablecoin created with SSS-2 compliance features cannot have those features removed after users have deposited tokens.

### Transfer Hook Fail-Closed Design

The transfer hook defaults to **reject** if:
- A blacklist PDA exists and is active
- Allowlist is enabled and a corresponding allowlist PDA does not exist

There is no "admin bypass" for transfers. Even the treasury authority cannot transfer tokens that are blocked by the hook, unless performing a seizure via permanent delegate.

---

## Key Compromise Analysis

### If the Treasury Authority key is compromised

**Impact: CRITICAL**

The authority can:
- Assign all 5 roles to attacker-controlled wallets
- Approve KYC for any address
- Configure oracle feeds (potentially setting malicious feeds)
- Transfer authority to attacker (but only via single-step `transfer_authority`)

The authority CANNOT:
- Bypass the transfer hook (blacklisted addresses stay blocked)
- Change immutable compliance flags
- Directly mint/burn without having the Minter/Burner role assigned

**Mitigation:** Use a multisig (e.g., Squads) as the treasury authority. Enable two-step authority transfer (`nominate_authority` + `accept_authority`) so that unintended transfers require cooperation.

### If a Minter key is compromised

**Impact: HIGH**

The attacker can mint tokens up to the minter's remaining quota and the global supply cap.

**Mitigation:**
- Set conservative per-minter quotas via `update_minter_quota`
- Set a global supply cap via `set_supply_cap`
- Configure oracle peg enforcement so minting only works when the price feed confirms peg
- Revoke the compromised minter's role immediately

### If a Burner key is compromised

**Impact: MEDIUM**

The attacker can burn tokens from the burner's own token account only (the `burn_tokens` instruction burns from the signer's ATA).

**Mitigation:** Revoke the compromised burner's role. Impact is limited to tokens the burner holds.

### If a Blacklister key is compromised

**Impact: HIGH**

The attacker can:
- Blacklist arbitrary addresses, blocking their transfers
- Remove existing blacklist entries, unblocking sanctioned addresses

**Mitigation:** Revoke the compromised key immediately. Re-blacklist any addresses that were improperly removed. Note that blacklist removal (deactivation) preserves the audit trail -- the `BlacklistEntry` account is not deleted, just set to `active=false`.

### If a Pauser key is compromised

**Impact: HIGH**

The attacker can:
- Pause the entire stablecoin (DoS attack)
- Freeze individual token accounts
- Thaw accounts that should remain frozen

**Mitigation:** Revoke the compromised key and unpause/re-freeze as needed using a different Pauser.

### If a Seizer key is compromised

**Impact: CRITICAL**

The attacker can seize tokens from any blacklisted address and send them to any token account.

**Mitigation:** The seizer cannot seize from non-blacklisted addresses (the on-chain program validates the blacklist entry). So the blast radius is limited to tokens held by currently blacklisted addresses. Revoke the compromised key immediately.

### If the Operator Keypair (backend server) is compromised

**Impact: Depends on assigned roles**

The backend operator keypair typically holds multiple roles. Compromising this key is equivalent to compromising all roles assigned to it.

**Mitigation:** Assign roles to separate keypairs where possible. Run the backend in a secure enclave. Rotate the keypair and re-assign roles if compromise is suspected.
