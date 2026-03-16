import * as fs from "fs";
import * as path from "path";
import { connection, VIEX_TREASURY_PROGRAM_ID } from "../config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  mint: string | null;
  data: Record<string, unknown>;
  signature: string | null;
}

// ---------------------------------------------------------------------------
// In-memory event store
// ---------------------------------------------------------------------------

const eventStore: AuditLogEntry[] = [];
const NDJSON_PATH = path.resolve(__dirname, "../../data/events.ndjson");
let subscriptionId: number | null = null;

// Ensure data directory exists
function ensureDataDir(): void {
  const dir = path.dirname(NDJSON_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Event parsing
// ---------------------------------------------------------------------------

function parseLogEvent(log: string): { name: string; data: Record<string, unknown> } | null {
  // Anchor emits events as base64-encoded data after "Program data:" prefix
  // We look for known event patterns in the logs
  const patterns = [
    "TokensMinted",
    "TokensBurned",
    "AccountFrozen",
    "AccountThawed",
    "Paused",
    "Unpaused",
    "BlacklistAdded",
    "BlacklistRemoved",
    "KycApproved",
    "KycRevoked",
    "RoleAssigned",
    "RoleRevoked",
    "TokensSeized",
    "TravelRuleAttached",
    "StablecoinInitialized",
    "MintRegistered",
    "AuthorityTransferred",
    "AuthorityNominated",
    "SupplyCapUpdated",
    "OracleConfigured",
    "MetadataUpdated",
    "FxPairConfigured",
    "FxPairRemoved",
    "CurrencyConverted",
    "AllowlistAdded",
    "AllowlistRemoved",
  ];

  for (const pattern of patterns) {
    if (log.includes(pattern)) {
      return { name: pattern, data: { rawLog: log } };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function addEvent(entry: AuditLogEntry): void {
  eventStore.push(entry);

  // Persist to NDJSON
  try {
    ensureDataDir();
    fs.appendFileSync(NDJSON_PATH, JSON.stringify(entry) + "\n");
  } catch (err) {
    console.error("Failed to persist event:", err);
  }
}

export function getEventsForMint(
  mint: string,
  limit: number = 50
): AuditLogEntry[] {
  return eventStore
    .filter((e) => e.mint === mint)
    .slice(-limit)
    .reverse();
}

export function getAuditLog(params: {
  action?: string;
  limit?: number;
  offset?: number;
}): { total: number; entries: AuditLogEntry[] } {
  let filtered = eventStore;

  if (params.action) {
    filtered = filtered.filter((e) => e.action === params.action);
  }

  const total = filtered.length;
  const offset = params.offset || 0;
  const limit = params.limit || 50;
  const entries = filtered.slice(offset, offset + limit).reverse();

  return { total, entries };
}

export function startEventSubscription(): void {
  if (subscriptionId !== null) return;

  try {
    subscriptionId = connection.onLogs(
      VIEX_TREASURY_PROGRAM_ID,
      (logInfo) => {
        const { signature, logs } = logInfo;

        for (const log of logs) {
          const parsed = parseLogEvent(log);
          if (parsed) {
            const entry: AuditLogEntry = {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: new Date().toISOString(),
              action: parsed.name,
              mint: null,
              data: parsed.data,
              signature,
            };
            addEvent(entry);
          }
        }
      },
      "confirmed"
    );
    console.log("Event subscription started");
  } catch (err) {
    console.error("Failed to start event subscription:", err);
  }
}

export function stopEventSubscription(): void {
  if (subscriptionId !== null) {
    connection.removeOnLogsListener(subscriptionId);
    subscriptionId = null;
    console.log("Event subscription stopped");
  }
}

/**
 * Load persisted events from NDJSON on startup.
 */
export function loadPersistedEvents(): void {
  try {
    if (fs.existsSync(NDJSON_PATH)) {
      const content = fs.readFileSync(NDJSON_PATH, "utf-8").trim();
      if (content) {
        const lines = content.split("\n");
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as AuditLogEntry;
            eventStore.push(entry);
          } catch {
            // Skip malformed lines
          }
        }
        console.log(`Loaded ${eventStore.length} persisted events`);
      }
    }
  } catch (err) {
    console.error("Failed to load persisted events:", err);
  }
}
