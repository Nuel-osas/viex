# VIEX Backend API Reference

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

The backend uses optional API key authentication via the `X-API-Key` header. When the `API_KEY` environment variable is set, all `/api/*` routes require a matching header.

```
X-API-Key: your-api-key-here
```

If `API_KEY` is not set in the environment, all requests pass through without authentication.

## Response Format

All responses follow a consistent envelope:

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": "Human-readable error message",
  "stack": "..." // Only in non-production environments
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing fields, invalid addresses) |
| 401 | Unauthorized (invalid or missing API key) |
| 404 | Not found |
| 500 | Internal server error |
| 503 | Service degraded (health check only) |

---

## Endpoints

### Health

#### `GET /health`

Returns service health status. Not behind API key auth.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-25T00:00:00.000Z",
    "slot": 123456789,
    "programId": "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU",
    "operator": "<operator_public_key>"
  }
}
```

---

### Treasury

#### `GET /api/v1/treasury`

Get treasury state.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `authority` | `string` | No | Override authority public key (defaults to operator) |

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "<treasury_pda>",
    "authority": "<authority_pubkey>",
    "name": "Acme Treasury",
    "baseCurrency": "USD",
    "mints": ["<mint1>", "<mint2>"],
    "travelRuleThreshold": "3000000000",
    "kycRequired": true,
    "createdAt": 1711324800
  }
}
```

#### `GET /api/v1/treasury/mints`

List registered mints with supply info.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `authority` | `string` | No | Override authority public key |

**Response:**
```json
{
  "success": true,
  "data": {
    "mints": [
      {
        "mint": "<mint_address>",
        "name": "Acme USD",
        "symbol": "AUSD",
        "decimals": 6,
        "paused": false,
        "totalMinted": "1000000000",
        "totalBurned": "0",
        "currentSupply": "1000000000"
      }
    ]
  }
}
```

---

### Stablecoin

#### `GET /api/v1/stablecoin/:mint`

Get stablecoin state by mint address.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `mint` | `string` | Mint public key |

**Response:**
```json
{
  "success": true,
  "data": {
    "mint": "<mint_address>",
    "name": "Acme USD",
    "symbol": "AUSD",
    "decimals": 6,
    "authority": "<authority_pubkey>",
    "treasury": "<treasury_pda>",
    "paused": false,
    "enablePermanentDelegate": true,
    "enableTransferHook": true,
    "enableAllowlist": false,
    "totalMinted": "1000000000",
    "totalBurned": "0",
    "supplyCap": "0"
  }
}
```

---

### Supply

#### `GET /api/v1/supply/:mint`

Get supply breakdown for a stablecoin.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `mint` | `string` | Mint public key |

**Response:**
```json
{
  "success": true,
  "data": {
    "mint": "<mint_address>",
    "totalMinted": "1000000000",
    "totalBurned": "0",
    "netSupply": "1000000000",
    "supplyCap": "0",
    "onChainSupply": "1000000000"
  }
}
```

---

### Operations

#### `POST /api/v1/mint`

Mint tokens to a recipient.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "recipient": "<recipient_pubkey>",
  "amount": "1000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "recipient": "<recipient_pubkey>",
    "amount": "1000000000"
  }
}
```

#### `POST /api/v1/burn`

Burn tokens from the operator's account.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "amount": "500000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "amount": "500000000"
  }
}
```

#### `POST /api/v1/freeze`

Freeze a token account.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "tokenAccount": "<token_account_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "tokenAccount": "<token_account_address>"
  }
}
```

#### `POST /api/v1/thaw`

Thaw a frozen token account.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "tokenAccount": "<token_account_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "tokenAccount": "<token_account_address>"
  }
}
```

#### `POST /api/v1/pause`

Pause all operations for a stablecoin.

**Request body:**
```json
{
  "mint": "<mint_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>"
  }
}
```

#### `POST /api/v1/unpause`

Unpause a stablecoin.

**Request body:**
```json
{
  "mint": "<mint_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>"
  }
}
```

---

### Compliance

#### `POST /api/v1/compliance/blacklist`

Add an address to the blacklist.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "address": "<target_address>",
  "reason": "OFAC SDN match"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "address": "<target_address>",
    "reason": "OFAC SDN match"
  }
}
```

#### `DELETE /api/v1/compliance/blacklist`

Remove an address from the blacklist.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "address": "<target_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "address": "<target_address>"
  }
}
```

#### `GET /api/v1/compliance/blacklist/:mint/:address`

Check if an address is blacklisted.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `mint` | `string` | Mint public key |
| `address` | `string` | Address to check |

**Response:**
```json
{
  "success": true,
  "data": {
    "blacklisted": true,
    "entry": {
      "stablecoin": "<stablecoin_pda>",
      "address": "<target_address>",
      "reason": "OFAC SDN match",
      "active": true,
      "blacklistedAt": 1711324800,
      "blacklistedBy": "<authority_pubkey>"
    }
  }
}
```

#### `POST /api/v1/compliance/seize`

Seize tokens from a blacklisted address.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "sourceAccount": "<source_token_account>",
  "treasuryAccount": "<treasury_token_account>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "sourceAccount": "<source_token_account>",
    "treasuryAccount": "<treasury_token_account>"
  }
}
```

---

### KYC

#### `POST /api/v1/kyc/approve`

Approve KYC for an address.

**Request body:**
```json
{
  "address": "<wallet_address>",
  "level": 2,
  "jurisdiction": "USA",
  "provider": "Sumsub",
  "expiresAt": 1742860800
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "address": "<wallet_address>",
    "level": 2,
    "jurisdiction": "USA",
    "provider": "Sumsub",
    "expiresAt": 1742860800
  }
}
```

#### `POST /api/v1/kyc/revoke`

Revoke KYC for an address.

**Request body:**
```json
{
  "address": "<wallet_address>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "address": "<wallet_address>"
  }
}
```

#### `GET /api/v1/kyc/:address`

Check KYC status for an address.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `address` | `string` | Wallet address |

**Response:**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "entry": {
      "treasury": "<treasury_pda>",
      "address": "<wallet_address>",
      "kycLevel": { "enhanced": {} },
      "jurisdiction": [85, 83, 65],
      "provider": "Sumsub",
      "approvedAt": 1711324800,
      "expiresAt": 1742860800,
      "approvedBy": "<authority_pubkey>",
      "active": true
    }
  }
}
```

---

### Travel Rule

#### `POST /api/v1/travel-rule`

Attach travel rule data to a transfer.

**Request body:**
```json
{
  "sourceMint": "<mint_address>",
  "originator": "<originator_pubkey>",
  "beneficiary": "<beneficiary_pubkey>",
  "transferSignature": "<base64_encoded_64_bytes>",
  "amount": "5000000000",
  "originatorName": "Alice Corp",
  "originatorVasp": "VASP-US-001",
  "beneficiaryName": "Bob Ltd",
  "beneficiaryVasp": "VASP-CH-002"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "sigHash": "<hex_encoded_sha256>",
    "travelRuleMessageAddress": "<pda_address>"
  }
}
```

#### `GET /api/v1/travel-rule/:sigHash`

Get a travel rule message by signature hash.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `sigHash` | `string` | Hex-encoded SHA-256 hash of the transfer signature (32 bytes) |

**Response:**
```json
{
  "success": true,
  "data": {
    "treasury": "<treasury_pda>",
    "transferSignature": "<base64>",
    "sourceMint": "<mint_address>",
    "amount": "5000000000",
    "originatorName": "Alice Corp",
    "originatorVasp": "VASP-US-001",
    "originatorAccount": "<originator_pubkey>",
    "beneficiaryName": "Bob Ltd",
    "beneficiaryVasp": "VASP-CH-002",
    "beneficiaryAccount": "<beneficiary_pubkey>",
    "createdAt": 1711324800,
    "createdBy": "<authority_pubkey>"
  }
}
```

---

### Roles

#### `POST /api/v1/roles/assign`

Assign a role to an address.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "role": "minter",
  "address": "<assignee_pubkey>"
}
```

Valid roles: `minter`, `burner`, `blacklister`, `pauser`, `seizer`

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "role": "minter",
    "address": "<assignee_pubkey>"
  }
}
```

#### `POST /api/v1/roles/revoke`

Revoke a role from an address.

**Request body:**
```json
{
  "mint": "<mint_address>",
  "role": "minter",
  "address": "<assignee_pubkey>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "<tx_signature>",
    "mint": "<mint_address>",
    "role": "minter",
    "address": "<assignee_pubkey>"
  }
}
```

---

### Events

#### `GET /api/v1/events/:mint`

Get recent events for a stablecoin mint.

**Path parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `mint` | `string` | Mint public key |

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `number` | 50 | Max events to return |

**Response:**
```json
{
  "success": true,
  "data": {
    "mint": "<mint_address>",
    "events": [ ... ],
    "count": 15
  }
}
```

#### `GET /api/v1/audit-log`

Get the audit log with optional filtering.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `action` | `string` | - | Filter by action type |
| `limit` | `number` | 50 | Max entries |
| `offset` | `number` | 0 | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [ ... ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```
