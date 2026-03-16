import app from "./app";
import { PORT, VIEX_TREASURY_PROGRAM_ID, operatorKeypair } from "./config";
import { loadPersistedEvents, startEventSubscription } from "./services/events";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Load any previously persisted events
  loadPersistedEvents();

  // Start on-chain event subscription
  startEventSubscription();

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║            VIEX Treasury API Server                  ║
╠══════════════════════════════════════════════════════╣
║  Port:      ${String(PORT).padEnd(40)}║
║  Program:   ${VIEX_TREASURY_PROGRAM_ID.toBase58().substring(0, 38).padEnd(40)}║
║  Operator:  ${operatorKeypair.publicKey.toBase58().substring(0, 38).padEnd(40)}║
╚══════════════════════════════════════════════════════╝
    `);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
