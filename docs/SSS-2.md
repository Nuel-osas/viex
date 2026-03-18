# SSS-2: Compliant Stablecoin Preset

## Overview

SSS-2 is the standard compliance preset for regulated stablecoin issuers. It enables permanent delegate (seizure), transfer hook (blacklist enforcement), and default frozen accounts (new token accounts start frozen and must be thawed by the authority).

## Token-2022 Extensions

| Extension | Enabled |
|-----------|---------|
| Metadata pointer | Yes |
| Permanent delegate | Yes |
| Transfer hook | Yes |
| Default account state (frozen) | Yes |
| Confidential transfer | No |
| Allowlist (KYC gate) | No |

## Configuration Flags

```rust
StablecoinInitConfig {
    enable_permanent_delegate: true,
    enable_transfer_hook: true,
    enable_allowlist: false,
    enable_default_account_state: true,
    enable_confidential_transfer: false,
}
```

## Operations Available

All SSS-1 operations, plus:

- **Blacklist enforcement**: Transfer hook checks sender and recipient against on-chain blacklist PDAs. Blacklisted addresses cannot send or receive tokens.
- **Freeze/thaw individual accounts**: The Pauser can freeze or thaw specific token accounts. New accounts start frozen.
- **Seizure**: The Seizer can transfer tokens from any account to a treasury account using the permanent delegate. The transfer hook detects delegate seizures and bypasses blacklist checks.
- **OFAC workflow**: Full screen, blacklist, freeze, seize, burn, remint pipeline.

## Operations NOT Available

- **Allowlist/KYC gate on transfers**: Transfers are open to anyone who is not blacklisted. KYC entries exist in the registry but do not gate transfers.
- **Confidential transfers**: Transfer amounts are visible on-chain.

## Use Cases

- **Regulated USD/EUR/BRL stablecoins**: Full AML/sanctions compliance for fiat-backed stablecoins under GENIUS Act, MiCA, or similar frameworks.
- **PYUSD/USDP-style issuance**: Matches the compliance model used by PayPal USD and Paxos USD on Ethereum (freeze + seizure + blacklist).
- **Institutional treasury**: Corporate stablecoin operations where AML enforcement is required but KYC gating at the transfer level is not.
- **Cross-border remittance**: Combined with travel rule messages for FATF compliance.

## Default Frozen Behavior

All new Token-2022 accounts for SSS-2 mints start in a frozen state. This means:

1. User creates a token account (ATA)
2. The account is frozen by default -- they cannot receive tokens
3. The authority (or Pauser role) must thaw the account first
4. Once thawed, the account can send and receive tokens normally

This provides an implicit allowlisting mechanism: only accounts explicitly thawed by the operator can participate.

## CLI Usage

```bash
viex init sss-2 \
  --name "Acme USD" \
  --symbol AUSD \
  --decimals 6 \
  --mint new \
  --cluster devnet
```

## Transfer Hook Flow

On every transfer of an SSS-2 token:

```
Token-2022 transfer
  │
  ▼
viex_transfer_hook.execute()
  │
  ├── Is this a permanent delegate seizure?
  │     Yes → SKIP checks, allow transfer
  │     No  → Continue
  │
  ├── Check source blacklist PDA → if active: REJECT
  ├── Check dest blacklist PDA   → if active: REJECT
  │
  ├── Is allowlist enabled? (SSS-2: No)
  │     → SKIP allowlist checks
  │
  ▼
  APPROVED
```
