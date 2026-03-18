# VIEX Compliance Documentation

## GENIUS Act Mapping

The Guiding and Establishing National Innovation for U.S. Stablecoins (GENIUS) Act establishes requirements for stablecoin issuers. Below is a mapping of specific sections to VIEX features.

| GENIUS Act Requirement | Section | VIEX Implementation |
|------------------------|---------|---------------------|
| **Issuer must maintain reserves** | Sec. 4(a) | Treasury account tracks `total_minted` and `total_burned` per stablecoin. Supply cap enforcement ensures issuance is bounded. Oracle peg enforcement validates 1:1 backing at mint/burn time. |
| **Redemption at par** | Sec. 4(b) | `burn_tokens` instruction allows any burner to redeem. Oracle enforcement ensures burn only proceeds when the stablecoin is trading at peg. |
| **AML/BSA compliance** | Sec. 5(a) | On-chain blacklist with transfer hook enforcement. Permanent delegate seizure. Freeze/thaw. All actions emit timestamped events for audit. |
| **KYC requirements** | Sec. 5(b) | 3-tier KYC registry (Basic, Enhanced, Institutional). Jurisdiction tracking. Provider attribution. Expiry enforcement. Allowlist gates transfers for SSS-3. |
| **Transaction monitoring** | Sec. 5(c) | Every state change emits an Anchor event. Backend webhook system for real-time screening. Audit log API for historical queries. |
| **Sanctions compliance** | Sec. 5(d) | Blacklist PDA checked on every transfer via hook. OFAC SDN workflow: screen, blacklist, freeze, seize, burn. Integration points for Chainalysis/Elliptic. |
| **Travel Rule** | Sec. 5(e) | On-chain `TravelRuleMessage` accounts with originator/beneficiary VASP data. Configurable threshold per treasury (default $3,000). |
| **Recordkeeping** | Sec. 6 | All compliance accounts persist on-chain. Deactivation preserves audit trail (entries not deleted). Events are immutable on-chain logs. |
| **Authority transfer restrictions** | Sec. 7 | Two-step authority transfer (`nominate_authority` + `accept_authority`) prevents accidental or malicious handoff. |

---

## KYC Implementation

### Three Levels

| Level | Value | Description | Typical Use |
|-------|-------|-------------|-------------|
| **Basic** | 1 | Name + government ID verified | Retail users, low-value transfers |
| **Enhanced** | 2 | Source of funds, PEP screening, enhanced due diligence | High-value individual transfers |
| **Institutional** | 3 | Full corporate due diligence, board resolution, UBO identification | Corporate treasury operations, VASP-to-VASP |

### Jurisdiction Tracking

Each KYC entry stores a 3-byte ISO 3166-1 alpha-3 country code (e.g., `USA`, `CHE`, `BRA`, `GBR`). This enables:

- Jurisdiction-specific compliance rules
- Cross-border transfer detection (originator and beneficiary in different jurisdictions triggers travel rule)
- Sanctions country blocking (entries from OFAC-sanctioned jurisdictions can be rejected at the application layer)

### Expiry

Each KYC entry has an `expires_at` field (Unix timestamp). Setting it to `0` means the entry never expires.

- The SDK's `KycModule.isApproved()` checks both `active` status and expiry
- Applications should re-verify KYC before expiry
- Expired entries remain on-chain for audit; they just fail the `isApproved()` check

### How the Allowlist Gates Transfers

For SSS-3 stablecoins (`enable_allowlist = true`):

1. User completes KYC through an off-chain provider (Sumsub, Jumio, etc.)
2. Treasury authority calls `kyc_approve` to create/update a KycEntry PDA
3. Treasury authority calls `add_to_allowlist` for each stablecoin the user should access
4. The transfer hook checks for the AllowlistEntry PDA on every transfer
5. If either sender or recipient lacks an allowlist entry, the transfer is rejected

```
KYC Provider  ──▶  Backend verifies  ──▶  kyc_approve (on-chain)
                                      ──▶  add_to_allowlist (on-chain)
                                               │
User transfer ──▶ Token-2022 ──▶ Transfer Hook checks AllowlistEntry PDA
                                      │
                                      ├── PDA exists → PASS
                                      └── PDA missing → REJECT
```

---

## KYT (Know Your Transaction) Implementation

### Event Emission

Every on-chain state change emits a timestamped Anchor event:

| Event | Trigger |
|-------|---------|
| `StablecoinInitialized` | New stablecoin created |
| `TokensMinted` | Tokens minted |
| `TokensBurned` | Tokens burned |
| `AccountFrozen` / `AccountThawed` | Individual freeze/thaw |
| `Paused` / `Unpaused` | Global circuit breaker |
| `RoleAssigned` / `RoleRevoked` | RBAC changes |
| `BlacklistAdded` / `BlacklistRemoved` | AML blacklist changes |
| `AllowlistAdded` / `AllowlistRemoved` | KYC gate changes |
| `TokensSeized` | Permanent delegate seizure |
| `KycApproved` / `KycRevoked` | KYC status changes |
| `TravelRuleAttached` | Travel rule message creation |
| `CurrencyConverted` | FX conversion |
| `TreasuryCreated` / `MintRegistered` | Treasury lifecycle |
| `FxPairConfigured` / `FxPairRemoved` | FX pair management |
| All `*Closed` events | Rent reclamation |

### Webhook System

The backend provides a webhook-based notification system:

1. The backend's event service listens for on-chain program logs
2. Parsed events are stored in an in-memory audit log
3. The `GET /api/v1/events/:mint` endpoint returns recent events for a mint
4. The `GET /api/v1/audit-log` endpoint provides filterable audit history
5. External systems (Chainalysis, internal SIEM) can poll these endpoints or register webhooks

### Audit Log

The audit log captures:

- **Action type** (mint, burn, blacklist, kyc, etc.)
- **Actor** (which wallet performed the action)
- **Target** (which address/account was affected)
- **Timestamp** (on-chain clock)
- **Transaction signature** (for on-chain verification)

---

## AML Implementation

### Blacklist + Freeze + Seize Pipeline

```
1. Detection
   │  External screening (Chainalysis, Elliptic, manual review)
   │  identifies a bad actor address
   │
   ▼
2. Blacklist
   │  Blacklister calls: add_to_blacklist(mint, address, "OFAC SDN match")
   │  Creates BlacklistEntry PDA with active=true
   │  Transfer hook now blocks all transfers to/from this address
   │
   ▼
3. Freeze (optional, recommended)
   │  Pauser calls: freeze_account(mint, token_account)
   │  The token account is frozen at the Token-2022 level
   │  Even if blacklist is somehow bypassed, tokens cannot move
   │
   ▼
4. Seize
   │  Seizer calls: seize(mint, source_token_account, treasury_token_account)
   │  Uses the permanent delegate extension to transfer tokens
   │  The transfer hook bypasses blacklist checks for delegate seizures
   │  Tokens move to a treasury-controlled account
   │
   ▼
5. Burn
   │  Burner calls: burn_tokens(mint, amount)
   │  Seized tokens are burned from the treasury account
   │
   ▼
6. Remint (if applicable)
   │  If there is a lawful claimant, authority mints new tokens to them
   │  Creates a full audit trail of the seizure and remediation
```

### Blacklist Deactivation vs Deletion

VIEX uses a two-step process for blacklist management:

- `remove_from_blacklist` sets `active = false` but keeps the account open. The PDA still exists on-chain as an audit record.
- `close_blacklist_entry` can only be called after deactivation. It closes the account and returns rent to the authority.

This preserves a permanent audit trail while allowing rent reclamation for resolved cases.

---

## Travel Rule

### FATF Requirements

The Financial Action Task Force (FATF) Recommendation 16 requires VASPs to exchange specific information for transfers above a threshold. VIEX maps these requirements to `TravelRuleMessage` fields:

| FATF Required Data | TravelRuleMessage Field | Format |
|-------------------|------------------------|--------|
| Originator name | `originator_name` | String, max 64 chars |
| Originator VASP | `originator_vasp` | VASP identifier, max 64 chars |
| Originator account | `originator_account` | Solana public key |
| Beneficiary name | `beneficiary_name` | String, max 64 chars |
| Beneficiary VASP | `beneficiary_vasp` | VASP identifier, max 64 chars |
| Beneficiary account | `beneficiary_account` | Solana public key |
| Transfer amount | `amount` | u64 (raw token amount) |
| Transfer reference | `transfer_signature` | 64-byte transaction signature |
| Timestamp | `created_at` | Unix timestamp (on-chain clock) |

### Threshold Configuration

Each treasury has a configurable `travel_rule_threshold` (default: 3,000,000,000 = $3,000 at 6 decimals). The application layer is responsible for checking whether a transfer exceeds the threshold and attaching travel rule data accordingly.

### SHA-256 Signature Linking

The `TravelRuleMessage` PDA is derived from `["travel_rule", treasury, SHA256(transfer_signature)]`. This:

- Links the compliance message cryptographically to the specific transfer
- Allows lookup by signature hash
- Prevents duplicate messages for the same transfer

### Workflow

```
1. User initiates transfer ──▶ Token-2022 transfer ──▶ get tx signature
2. Backend checks: amount > travel_rule_threshold?
   │  No  ──▶ Done
   │  Yes ──▼
3. Backend calls: attach_travel_rule(
     transfer_signature,
     sig_hash,
     amount,
     originator_name, originator_vasp,
     beneficiary_name, beneficiary_vasp
   )
4. TravelRuleMessage PDA created on-chain
5. Counterparty VASP can query the message by sig_hash
```

---

## OFAC SDN List Workflow

### End-to-End Procedure

```
┌──────────────────────────────────────────────────────────────┐
│  1. SCREEN                                                    │
│  - Run all user addresses against OFAC SDN List               │
│  - Use Chainalysis KYT or Elliptic Lens API                   │
│  - Also screen against EU, UN, and local sanctions lists       │
│  - Frequency: every new user, daily batch, real-time on        │
│    high-value transfers                                        │
└───────────────────────┬──────────────────────────────────────┘
                        │ Match found
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  2. BLACKLIST                                                 │
│  viex blacklist add --mint <MINT> \                           │
│    --address <SANCTIONED_ADDRESS> \                           │
│    --reason "OFAC SDN List - [Name] - [SDN Entry ID]"         │
│                                                               │
│  Result: BlacklistEntry PDA created, transfers blocked         │
└───────────────────────┬──────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  3. FREEZE                                                    │
│  viex freeze --mint <MINT> --account <TOKEN_ACCOUNT>          │
│                                                               │
│  Result: Token account frozen at Token-2022 level              │
└───────────────────────┬──────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  4. SEIZE                                                     │
│  viex seize --mint <MINT> \                                   │
│    --from <SANCTIONED_TOKEN_ACCOUNT> \                        │
│    --to <TREASURY_TOKEN_ACCOUNT>                              │
│                                                               │
│  Result: Tokens moved to treasury control via permanent        │
│  delegate. Emits TokensSeized event.                          │
└───────────────────────┬──────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  5. BURN                                                      │
│  viex burn --mint <MINT> --amount <SEIZED_AMOUNT>             │
│                                                               │
│  Result: Seized tokens destroyed. Emits TokensBurned event.   │
└───────────────────────┬──────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────────┐
│  6. REMINT (if applicable)                                    │
│  viex mint --mint <MINT> --to <LAWFUL_CLAIMANT> \             │
│    --amount <AMOUNT>                                          │
│                                                               │
│  Result: New tokens issued to the rightful owner if           │
│  a court order or OFAC license requires it.                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Sanctions Screening Integration Points

### Chainalysis KYT

Integration architecture:

```
User wallet ──▶ Backend ──▶ Chainalysis KYT API
                   │              │
                   │              ▼
                   │         Risk assessment
                   │              │
                   │              ├── Low risk ──▶ Allow
                   │              ├── Medium risk ──▶ Enhanced review
                   │              └── High risk / SDN match ──▼
                   │
                   ▼
            viex blacklist add (on-chain)
```

- **Endpoint:** `POST https://api.chainalysis.com/api/kyt/v2/users/{userId}/transfers`
- **When:** On every deposit/withdrawal, and periodic batch screening
- **Action on match:** Automatic blacklist via backend operator

### Elliptic Lens

Integration architecture:

```
User wallet ──▶ Backend ──▶ Elliptic Lens API
                   │              │
                   │              ▼
                   │         Wallet screening
                   │              │
                   │              ├── Clean ──▶ Allow
                   │              └── Flagged ──▼
                   │
                   ▼
            viex blacklist add (on-chain)
```

- **Endpoint:** `POST https://api.elliptic.co/v2/wallet/synchronous`
- **When:** Before KYC approval, periodic re-screening
- **Action on match:** Block KYC approval, blacklist if already approved

---

## False Positive Resolution Procedure

When a screening match is determined to be a false positive:

1. **Document:** Record the false positive determination with supporting evidence (different person, name similarity, etc.)

2. **Remove from blacklist:**
   ```
   viex blacklist remove --mint <MINT> --address <ADDRESS>
   ```
   This sets `active = false` but preserves the original blacklist record.

3. **Thaw account (if frozen):**
   ```
   viex thaw --mint <MINT> --account <TOKEN_ACCOUNT>
   ```

4. **Return seized funds (if seized):**
   ```
   viex mint --mint <MINT> --to <USER_ADDRESS> --amount <SEIZED_AMOUNT>
   ```

5. **Update audit log:** The backend should record the false positive resolution with:
   - Original screening result
   - Investigation findings
   - Approving officer
   - Date of resolution

6. **Update screening provider:** Report the false positive to Chainalysis/Elliptic to improve future accuracy.

Note: The on-chain BlacklistEntry is NOT closed immediately after false positive resolution. It should be retained for a regulatory retention period (typically 5 years under BSA). After the retention period, call `close_blacklist_entry` to reclaim rent.
