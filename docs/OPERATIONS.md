# VIEX Operations Guide

## Day-1 Setup

### 1. Create Treasury

```bash
viex init-treasury \
  --name "Acme Treasury" \
  --base-currency USD \
  --travel-rule-threshold 3000000000 \
  --kyc-required \
  --cluster devnet
```

This creates a Treasury PDA derived from your authority keypair. The treasury is the root account that coordinates all your stablecoins.

### 2. Deploy Stablecoins

Initialize one or more stablecoins under the treasury. Choose a preset based on your compliance requirements.

```bash
# SSS-2 (Compliant) — recommended for regulated issuers
viex init sss-2 \
  --name "Acme USD" \
  --symbol AUSD \
  --decimals 6 \
  --mint new \
  --cluster devnet

# Note the mint address from the output
MINT_ADDRESS=<output_mint_address>

# Register the mint with the treasury
viex register-mint --mint $MINT_ADDRESS --cluster devnet
```

### 3. Assign Roles

Assign the five operational roles. Each can go to a different wallet for separation of duties, or all to one operator wallet for simpler setups.

```bash
OPERATOR=<wallet_address>

viex roles assign --mint $MINT_ADDRESS --role minter     --address $OPERATOR --cluster devnet
viex roles assign --mint $MINT_ADDRESS --role burner     --address $OPERATOR --cluster devnet
viex roles assign --mint $MINT_ADDRESS --role pauser     --address $OPERATOR --cluster devnet
viex roles assign --mint $MINT_ADDRESS --role blacklister --address $OPERATOR --cluster devnet
viex roles assign --mint $MINT_ADDRESS --role seizer     --address $OPERATOR --cluster devnet
```

### 4. (Optional) Configure Oracle

If you want peg enforcement on mint/burn:

```bash
viex oracle configure \
  --mint $MINT_ADDRESS \
  --price-feed <PYTH_USD_FEED> \
  --max-deviation 100 \
  --max-staleness 300 \
  --cluster devnet
```

### 5. (Optional) Set Supply Cap

```bash
viex supply-cap --mint $MINT_ADDRESS --cap 100000000000 --cluster devnet
```

---

## Minting Workflow with KYC Verification

For treasuries with `kyc_required = true`:

### Step 1: Verify KYC Off-Chain

Use your KYC provider (Sumsub, Jumio, etc.) to verify the recipient's identity.

### Step 2: Approve KYC On-Chain

```bash
viex kyc approve \
  --address <RECIPIENT> \
  --level 2 \
  --jurisdiction USA \
  --provider Sumsub \
  --expires 1742860800 \
  --cluster devnet
```

### Step 3: Add to Allowlist (SSS-3 only)

If using SSS-3 (private preset with allowlist):

```bash
viex allowlist add --mint $MINT_ADDRESS --address <RECIPIENT> --cluster devnet
```

### Step 4: Mint Tokens

```bash
viex mint \
  --mint $MINT_ADDRESS \
  --to <RECIPIENT> \
  --amount 1000000000 \
  --cluster devnet
```

### Step 5: Verify

```bash
viex kyc check --address <RECIPIENT> --cluster devnet
viex status --mint $MINT_ADDRESS --cluster devnet
```

---

## OFAC Freeze/Seize Procedure

When an OFAC SDN match or other sanctions hit is confirmed:

### Step 1: Blacklist the Address

```bash
viex blacklist add \
  --mint $MINT_ADDRESS \
  --address <SANCTIONED_ADDRESS> \
  --reason "OFAC SDN List - [Name] - Entry [ID]" \
  --cluster devnet
```

All transfers to and from this address are now blocked by the transfer hook.

### Step 2: Freeze the Token Account

```bash
viex freeze \
  --mint $MINT_ADDRESS \
  --account <SANCTIONED_TOKEN_ACCOUNT> \
  --cluster devnet
```

This adds a Token-2022 level freeze as a secondary enforcement layer.

### Step 3: Seize Tokens

```bash
viex seize \
  --mint $MINT_ADDRESS \
  --from <SANCTIONED_TOKEN_ACCOUNT> \
  --to <TREASURY_TOKEN_ACCOUNT> \
  --cluster devnet
```

Tokens are transferred to the treasury-controlled account via permanent delegate authority.

### Step 4: Burn Seized Tokens

```bash
viex burn \
  --mint $MINT_ADDRESS \
  --amount <SEIZED_AMOUNT> \
  --cluster devnet
```

### Step 5: (If Required) Remint to Lawful Claimant

```bash
viex mint \
  --mint $MINT_ADDRESS \
  --to <LAWFUL_CLAIMANT> \
  --amount <AMOUNT> \
  --cluster devnet
```

### Step 6: Document

Verify the complete audit trail:

```bash
viex status --mint $MINT_ADDRESS --cluster devnet
viex blacklist check --mint $MINT_ADDRESS --address <SANCTIONED_ADDRESS> --cluster devnet
```

---

## Two-Step Authority Rotation

The two-step process prevents accidental authority loss:

### Step 1: Nominate New Authority

The current authority nominates a successor:

```bash
viex authority nominate \
  --mint $MINT_ADDRESS \
  --new-authority <NEW_AUTHORITY_PUBKEY> \
  --cluster devnet
```

### Step 2: Accept Authority

The new authority accepts (using their keypair):

```bash
viex authority accept \
  --mint $MINT_ADDRESS \
  --keypair <NEW_AUTHORITY_KEYPAIR_PATH> \
  --cluster devnet
```

### Emergency: Single-Step Transfer

If the new authority cannot run the CLI (e.g., it is a multisig):

```bash
viex authority transfer \
  --mint $MINT_ADDRESS \
  --new-authority <NEW_AUTHORITY_PUBKEY> \
  --cluster devnet
```

This transfers immediately without acceptance.

---

## Travel Rule Compliance for Cross-Border Transfers

### When Travel Rule Applies

Travel rule data is required when:
- Transfer amount exceeds the treasury's `travel_rule_threshold` (default: $3,000)
- Transfer crosses jurisdictions (originator and beneficiary KYC entries show different countries)

### Workflow

#### 1. Execute the Transfer

```bash
# Transfer tokens (get the tx signature)
viex transfer \
  --mint $MINT_ADDRESS \
  --to <BENEFICIARY> \
  --amount 5000000000 \
  --cluster devnet
```

Note the transaction signature from the output.

#### 2. Attach Travel Rule Data

```bash
viex travel-rule attach \
  --transfer-sig <HEX_ENCODED_TX_SIG> \
  --mint $MINT_ADDRESS \
  --amount 5000000000 \
  --originator-name "Alice Corp" \
  --originator-vasp "VASP-US-001" \
  --originator <ORIGINATOR_PUBKEY> \
  --beneficiary-name "Bob Ltd" \
  --beneficiary-vasp "VASP-CH-002" \
  --beneficiary <BENEFICIARY_PUBKEY> \
  --cluster devnet
```

#### 3. Counterparty Verification

The counterparty VASP can query the travel rule message:

```bash
# Via API
curl "http://localhost:3000/api/v1/travel-rule/<SIG_HASH_HEX>"
```

Or directly on-chain by deriving the TravelRuleMessage PDA from `["travel_rule", treasury, SHA256(transfer_signature)]`.

#### 4. Retention and Cleanup

Travel rule records should be retained for the regulatory retention period (typically 5 years). After that:

```bash
viex travel-rule close \
  --transfer-sig <HEX_ENCODED_TX_SIG> \
  --cluster devnet
```

---

## FX Conversion Workflow

### Setup

Configure an FX pair with a Pyth oracle:

```bash
# Configure USD→EUR conversion
viex fx configure \
  --source-mint <VUSD_MINT> \
  --dest-mint <VEUR_MINT> \
  --price-feed <PYTH_EUR_USD_FEED> \
  --max-staleness 300 \
  --max-slippage 50 \
  --cluster devnet
```

### Execute Conversion

```bash
viex fx convert \
  --source-mint <VUSD_MINT> \
  --dest-mint <VEUR_MINT> \
  --amount 1000000000 \
  --min-dest-amount 900000000 \
  --cluster devnet
```

The program:
1. Reads the Pyth FX rate
2. Validates staleness
3. Calculates destination amount
4. Checks slippage against `min_dest_amount`
5. Burns source tokens
6. Mints destination tokens
7. Emits `CurrencyConverted` event

### Remove FX Pair

```bash
viex fx remove \
  --source-mint <VUSD_MINT> \
  --dest-mint <VEUR_MINT> \
  --cluster devnet
```

---

## Monitoring and Alerts via Webhooks

### Backend Event Monitoring

Start the backend server:

```bash
cd backend
cp .env.example .env
# Edit .env with your RPC URL and operator keypair
npm run dev
```

### Polling Events

```bash
# Get recent events for a mint
curl "http://localhost:3000/api/v1/events/<MINT_ADDRESS>?limit=100" \
  -H "X-API-Key: your-key"

# Get audit log filtered by action
curl "http://localhost:3000/api/v1/audit-log?action=blacklist&limit=50" \
  -H "X-API-Key: your-key"
```

### Recommended Alert Rules

| Event | Severity | Action |
|-------|----------|--------|
| `BlacklistAdded` | HIGH | Notify compliance team immediately |
| `TokensSeized` | CRITICAL | Notify compliance + legal |
| `Paused` | HIGH | Investigate — was this intentional? |
| `AuthorityTransferred` | CRITICAL | Verify this was authorized |
| `RoleAssigned` (to unknown address) | HIGH | Verify the assignee |
| `KycRevoked` | MEDIUM | Check if user needs to be blocked |
| `OracleConfigured` (price feed changed) | HIGH | Verify the new feed is legitimate |

### Integration with External Systems

For production, connect the event stream to:

- **SIEM** (Splunk, DataDog): Forward audit log entries for centralized monitoring
- **Chainalysis KYT**: Screen each `TokensMinted` and `CurrencyConverted` event
- **PagerDuty/OpsGenie**: Route CRITICAL alerts for immediate response
- **Compliance dashboard**: Display real-time treasury state in the frontend

### Health Monitoring

```bash
# Check system health
curl "http://localhost:3000/health"

# Monitor in a loop
watch -n 30 'curl -s http://localhost:3000/health | jq .data.status'
```
