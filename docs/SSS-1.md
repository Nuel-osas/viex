# SSS-1: Minimal Stablecoin Preset

## Overview

SSS-1 is the simplest stablecoin configuration. It creates a Token-2022 mint with only metadata pointer enabled. No compliance extensions are active.

## Token-2022 Extensions

| Extension | Enabled |
|-----------|---------|
| Metadata pointer | Yes |
| Permanent delegate | No |
| Transfer hook | No |
| Default account state (frozen) | No |
| Confidential transfer | No |
| Allowlist (KYC gate) | No |

## Configuration Flags

```rust
StablecoinInitConfig {
    enable_permanent_delegate: false,
    enable_transfer_hook: false,
    enable_allowlist: false,
    enable_default_account_state: false,
    enable_confidential_transfer: false,
}
```

## Operations Available

- Mint tokens (with Minter role)
- Burn tokens (with Burner role)
- Pause / unpause (with Pauser role)
- Role management (assign, revoke, close)
- Authority transfer (nominate, accept, direct transfer)
- Metadata URI updates
- Oracle peg enforcement (optional)
- Supply cap and minter quota enforcement
- FX conversion (if FX pair configured)

## Operations NOT Available

- **Blacklist enforcement**: No transfer hook means blacklisted addresses can still transfer tokens. The BlacklistEntry PDA can be created but is not checked.
- **Freeze/thaw individual accounts**: No freeze authority is assigned to the mint.
- **Seizure**: No permanent delegate means tokens cannot be seized from user accounts.
- **Allowlist/KYC gate**: No allowlist enforcement on transfers.

## Use Cases

- **Internal testing**: Quick setup for development and testing without compliance overhead.
- **Utility tokens**: Non-financial tokens that do not require AML/KYC controls.
- **Wrapped assets**: Tokens representing non-monetary assets where compliance is handled at the application layer rather than the protocol layer.
- **Low-risk jurisdictions**: Stablecoins in jurisdictions that do not yet mandate on-chain compliance enforcement.

## CLI Usage

```bash
viex init sss-1 \
  --name "Test Token" \
  --symbol TST \
  --decimals 6 \
  --mint new \
  --cluster devnet
```

## Limitations

SSS-1 stablecoins should not be used for regulated stablecoin issuance. They lack the enforcement mechanisms required by the GENIUS Act, MiCA, and other stablecoin regulations. Upgrade to SSS-2 or SSS-3 for production regulated issuance.

Once initialized, the preset flags are immutable. An SSS-1 stablecoin cannot be upgraded to SSS-2 after creation. A new mint must be deployed.
