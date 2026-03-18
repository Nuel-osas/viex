# SSS-3: Private Stablecoin Preset

## Overview

SSS-3 is the most restrictive preset, designed for permissioned institutional networks. It includes everything from SSS-2 plus an on-chain allowlist (KYC gate) and confidential transfer support. Only addresses explicitly added to the allowlist can send or receive tokens.

## Token-2022 Extensions

| Extension | Enabled |
|-----------|---------|
| Metadata pointer | Yes |
| Permanent delegate | Yes |
| Transfer hook | Yes |
| Default account state (frozen) | Yes |
| Confidential transfer | Yes |
| Allowlist (KYC gate) | Yes |

## Configuration Flags

```rust
StablecoinInitConfig {
    enable_permanent_delegate: true,
    enable_transfer_hook: true,
    enable_allowlist: true,
    enable_default_account_state: true,
    enable_confidential_transfer: true,
}
```

## Operations Available

All SSS-2 operations, plus:

- **Allowlist enforcement**: Transfer hook checks both sender and recipient against on-chain AllowlistEntry PDAs. Addresses not on the allowlist cannot participate in any transfers.
- **KYC-gated transfers**: Only KYC-approved users (added to the allowlist after KYC verification) can transact.
- **Confidential transfers**: Token-2022 confidential transfer extension allows transfer amounts to be encrypted on-chain. Only the sender, recipient, and auditor can see the actual amounts.

## Operations NOT Available

All operations are available. SSS-3 is the full-feature preset.

## Use Cases

- **Institutional settlement networks**: Banks and financial institutions settling trades on-chain where only vetted counterparties may participate.
- **Private syndicate tokens**: Investment fund tokens where only accredited investors (KYC Level 3 - Institutional) may hold and transfer.
- **CBDC pilots**: Central bank digital currency experiments requiring strict identity verification and permissioned access.
- **Regulated security tokens**: Tokens representing securities where transfer restrictions are mandated by law.
- **Intra-VASP settlement**: VASP-to-VASP settlement networks where all participants are known and verified.

## Allowlist Workflow

```
1. User completes KYC
   │
   ▼
2. Authority: kyc_approve(address, level, jurisdiction, provider, expires_at)
   │  → Creates KycEntry PDA
   │
   ▼
3. Authority: add_to_allowlist(mint, address)
   │  → Creates AllowlistEntry PDA
   │
   ▼
4. Authority: thaw_account(mint, token_account)
   │  → Unfreezes the default-frozen token account
   │
   ▼
5. User can now send and receive SSS-3 tokens
```

To remove access:

```
1. Authority: remove_from_allowlist(mint, address)
   │  → Closes AllowlistEntry PDA (reclaims rent)
   │
   ▼
2. User can no longer receive tokens
   │  (Transfer hook rejects: "Recipient not on allowlist")
   │
   ▼
3. Authority: freeze_account(mint, token_account)
   │  → Prevents user from sending remaining tokens
   │
   ▼
4. (Optional) Authority: kyc_revoke(address)
   │  → Deactivates KYC entry
```

## Transfer Hook Flow

On every transfer of an SSS-3 token:

```
Token-2022 transfer
  │
  ▼
viex_transfer_hook.execute()
  │
  ├── Is this a permanent delegate seizure?
  │     Yes → SKIP all checks, allow transfer
  │     No  → Continue
  │
  ├── Check source blacklist PDA → if active: REJECT
  ├── Check dest blacklist PDA   → if active: REJECT
  │
  ├── Is allowlist enabled? (SSS-3: Yes)
  │     → Check source AllowlistEntry PDA → if missing: REJECT
  │     → Check dest AllowlistEntry PDA   → if missing: REJECT
  │
  ▼
  APPROVED (both parties are allowlisted and neither is blacklisted)
```

## Confidential Transfers

The confidential transfer extension uses ElGamal encryption so that:

- Transfer amounts are encrypted on-chain
- Only the sender, recipient, and designated auditor can decrypt
- The transfer hook still enforces blacklist/allowlist checks
- The total supply remains verifiable through ZK proofs

This is useful for institutional networks where transaction amounts are commercially sensitive but compliance enforcement must still operate.

## CLI Usage

```bash
viex init sss-3 \
  --name "Acme Private" \
  --symbol APRV \
  --decimals 6 \
  --mint new \
  --cluster devnet
```

## Rent Considerations

AllowlistEntry accounts require rent (~0.002 SOL each). For large networks:

- Budget for N allowlist entries at ~0.002 SOL each
- `remove_from_allowlist` automatically closes the account and reclaims rent
- Unlike blacklist entries, allowlist entries do not need a deactivation step -- removal is immediate
