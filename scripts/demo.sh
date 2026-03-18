#!/usr/bin/env bash
# =============================================================================
# VIEX Treasury — Devnet Demo Script
# =============================================================================
#
# Prerequisites:
#   1. solana-keygen and solana CLI installed
#   2. viex CLI npm-linked:  cd cli && npm install && npm link
#   3. Devnet SOL in default keypair:  solana airdrop 5 --url devnet
#
# Usage:
#   chmod +x scripts/demo.sh
#   ./scripts/demo.sh
#
# =============================================================================

set -euo pipefail

CLUSTER="devnet"
CLI="viex"
STEP=0
declare -a TX_SIGS=()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log_step() {
  STEP=$((STEP + 1))
  echo ""
  echo "============================================================"
  echo "  Step $STEP: $1"
  echo "============================================================"
}

log_info() {
  echo "  [INFO] $1"
}

log_ok() {
  echo "  [OK]   $1"
}

log_fail() {
  echo "  [FAIL] $1"
}

log_tx() {
  local sig="$1"
  TX_SIGS+=("$sig")
  echo "  [TX]   $sig"
}

extract_tx() {
  # Extract transaction signature from CLI output.
  # The viex CLI prints "Transaction: <sig>" — grab the last word on that line.
  local output="$1"
  echo "$output" | grep -i "transaction" | tail -1 | awk '{print $NF}' || echo "unknown"
}

extract_mint() {
  # Extract mint address from CLI output.
  local output="$1"
  echo "$output" | grep -i "^  Mint" | head -1 | awk '{print $NF}' || echo "unknown"
}

# ---------------------------------------------------------------------------
# Generate test wallets
# ---------------------------------------------------------------------------

log_step "Generating test wallets"

TMPDIR=$(mktemp -d)
OPERATOR_KEYPAIR="${HOME}/.config/solana/id.json"
SECOND_WALLET_KEYPAIR="${TMPDIR}/wallet2.json"
THIRD_WALLET_KEYPAIR="${TMPDIR}/wallet3.json"

solana-keygen new --no-passphrase --outfile "$SECOND_WALLET_KEYPAIR" --force --silent 2>/dev/null
solana-keygen new --no-passphrase --outfile "$THIRD_WALLET_KEYPAIR" --force --silent 2>/dev/null

OPERATOR=$(solana-keygen pubkey "$OPERATOR_KEYPAIR")
SECOND_WALLET=$(solana-keygen pubkey "$SECOND_WALLET_KEYPAIR")
THIRD_WALLET=$(solana-keygen pubkey "$THIRD_WALLET_KEYPAIR")

log_info "Operator:      $OPERATOR"
log_info "Second wallet: $SECOND_WALLET"
log_info "Third wallet:  $THIRD_WALLET"
log_ok "Test wallets generated"

# ---------------------------------------------------------------------------
# Step 1: Initialize Treasury
# ---------------------------------------------------------------------------

log_step "Initialize treasury 'VIEX Demo Treasury' with base currency USD, KYC required"

OUTPUT=$($CLI init-treasury \
  --name "VIEX Demo Treasury" \
  --base-currency USD \
  --travel-rule-threshold 3000000000 \
  --kyc-required \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 2: Initialize SSS-2 Stablecoin
# ---------------------------------------------------------------------------

log_step "Initialize SSS-2 stablecoin 'Demo USD' / DUSD with 6 decimals"

MINT_KEYPAIR="${TMPDIR}/mint.json"
solana-keygen new --no-passphrase --outfile "$MINT_KEYPAIR" --force --silent 2>/dev/null

OUTPUT=$($CLI init sss-2 \
  --name "Demo USD" \
  --symbol DUSD \
  --decimals 6 \
  --mint "$MINT_KEYPAIR" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
MINT=$(extract_mint "$OUTPUT")
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"
log_info "Mint address: $MINT"

# ---------------------------------------------------------------------------
# Step 3: Register DUSD in Treasury
# ---------------------------------------------------------------------------

log_step "Register DUSD in treasury"

OUTPUT=$($CLI register-mint \
  --mint "$MINT" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 4: Assign 5 Roles to Operator
# ---------------------------------------------------------------------------

log_step "Assign 5 roles (minter, burner, pauser, blacklister, seizer) to operator"

for ROLE in minter burner pauser blacklister seizer; do
  log_info "Assigning role: $ROLE"
  OUTPUT=$($CLI roles assign \
    --mint "$MINT" \
    --role "$ROLE" \
    --address "$OPERATOR" \
    --cluster $CLUSTER 2>&1) || true
  SIG=$(extract_tx "$OUTPUT")
  log_tx "$SIG"
done

# ---------------------------------------------------------------------------
# Step 5: Mint 1000 DUSD to Operator
# ---------------------------------------------------------------------------

log_step "Mint 1000 DUSD to operator"

OUTPUT=$($CLI mint \
  --mint "$MINT" \
  --to "$OPERATOR" \
  --amount 1000000000 \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 6: KYC Approve Operator (Level 2, USA)
# ---------------------------------------------------------------------------

log_step "KYC approve operator (level 2, jurisdiction USA, provider 'Internal')"

OUTPUT=$($CLI kyc approve \
  --address "$OPERATOR" \
  --level 2 \
  --jurisdiction USA \
  --provider "Internal" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 7: KYC Approve Second Wallet (Level 1, CHE)
# ---------------------------------------------------------------------------

log_step "KYC approve second wallet (level 1, jurisdiction CHE)"

OUTPUT=$($CLI kyc approve \
  --address "$SECOND_WALLET" \
  --level 1 \
  --jurisdiction CHE \
  --provider "Internal" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 8: Mint 500 DUSD to Second Wallet
# ---------------------------------------------------------------------------

log_step "Mint 500 DUSD to second wallet"

OUTPUT=$($CLI mint \
  --mint "$MINT" \
  --to "$SECOND_WALLET" \
  --amount 500000000 \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 9: Blacklist Third Wallet
# ---------------------------------------------------------------------------

log_step "Blacklist third wallet with reason 'OFAC SDN match'"

OUTPUT=$($CLI blacklist add \
  --mint "$MINT" \
  --address "$THIRD_WALLET" \
  --reason "OFAC SDN match" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 10: Attempt Transfer to Blacklisted Wallet (should fail)
# ---------------------------------------------------------------------------

log_step "Attempt transfer to blacklisted wallet (should fail)"

OUTPUT=$($CLI mint \
  --mint "$MINT" \
  --to "$THIRD_WALLET" \
  --amount 100000000 \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"

if echo "$OUTPUT" | grep -qi "error\|fail\|blacklist\|rejected"; then
  log_ok "Transfer correctly rejected (blacklisted address)"
else
  log_fail "Transfer should have been rejected but was not"
fi

# ---------------------------------------------------------------------------
# Step 11: Seize from Blacklisted Wallet (if they have tokens)
# ---------------------------------------------------------------------------

log_step "Seize from blacklisted wallet (if they have tokens)"

log_info "Third wallet has no tokens to seize (they were blacklisted before receiving any)"
log_info "Skipping seize — in production, seize would be called on a funded blacklisted account"

# ---------------------------------------------------------------------------
# Step 12: Attach Travel Rule Data
# ---------------------------------------------------------------------------

log_step "Attach travel rule data to a transfer"

# Generate a dummy 64-byte transfer signature (hex encoded)
DUMMY_SIG=$(openssl rand -hex 64)

OUTPUT=$($CLI travel-rule attach \
  --transfer-sig "$DUMMY_SIG" \
  --mint "$MINT" \
  --amount 5000000000 \
  --originator-name "Demo Originator Corp" \
  --originator-vasp "VASP-US-DEMO" \
  --originator "$OPERATOR" \
  --beneficiary-name "Demo Beneficiary Ltd" \
  --beneficiary-vasp "VASP-CH-DEMO" \
  --beneficiary "$SECOND_WALLET" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 13: Pause Stablecoin
# ---------------------------------------------------------------------------

log_step "Pause stablecoin"

OUTPUT=$($CLI pause \
  --mint "$MINT" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 14: Attempt Mint While Paused (should fail)
# ---------------------------------------------------------------------------

log_step "Attempt mint while paused (should fail)"

OUTPUT=$($CLI mint \
  --mint "$MINT" \
  --to "$OPERATOR" \
  --amount 100000000 \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"

if echo "$OUTPUT" | grep -qi "error\|fail\|paused"; then
  log_ok "Mint correctly rejected (stablecoin is paused)"
else
  log_fail "Mint should have been rejected but was not"
fi

# ---------------------------------------------------------------------------
# Step 15: Unpause
# ---------------------------------------------------------------------------

log_step "Unpause stablecoin"

OUTPUT=$($CLI unpause \
  --mint "$MINT" \
  --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"
SIG=$(extract_tx "$OUTPUT")
log_tx "$SIG"

# ---------------------------------------------------------------------------
# Step 16: Check Status
# ---------------------------------------------------------------------------

log_step "Check stablecoin status"

OUTPUT=$($CLI status --mint "$MINT" --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"

echo ""
OUTPUT=$($CLI treasury-status --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"

echo ""
OUTPUT=$($CLI kyc check --address "$OPERATOR" --cluster $CLUSTER 2>&1) || true
echo "$OUTPUT"

# ---------------------------------------------------------------------------
# Step 17: Print All Transaction Signatures
# ---------------------------------------------------------------------------

log_step "Print all transaction signatures"

echo ""
echo "  Total transactions: ${#TX_SIGS[@]}"
echo "  ────────────────────────────────────────────────────────"
for i in "${!TX_SIGS[@]}"; do
  printf "  [%2d] %s\n" $((i + 1)) "${TX_SIGS[$i]}"
done
echo "  ────────────────────────────────────────────────────────"
echo ""
echo "  Explorer links (devnet):"
for sig in "${TX_SIGS[@]}"; do
  if [ "$sig" != "unknown" ]; then
    echo "  https://explorer.solana.com/tx/${sig}?cluster=devnet"
  fi
done

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

echo ""
echo "============================================================"
echo "  Demo complete!"
echo "============================================================"
echo ""
echo "  Temp files: $TMPDIR"
echo "  Operator:   $OPERATOR"
echo "  Mint:       $MINT"
echo ""

# Clean up temp keypairs
rm -rf "$TMPDIR"
