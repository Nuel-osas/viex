import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { apiKeyAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error";

// Route imports
import healthRouter from "./routes/health";
import treasuryRouter from "./routes/treasury";
import stablecoinRouter from "./routes/stablecoin";
import supplyRouter from "./routes/supply";
import operationsRouter from "./routes/operations";
import complianceRouter from "./routes/compliance";
import kycRouter from "./routes/kyc";
import travelRuleRouter from "./routes/travel-rule";
import rolesRouter from "./routes/roles";
import eventsRouter from "./routes/events";

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging (skip in test)
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// API key auth (optional — only enforced when API_KEY is set)
app.use("/api", apiKeyAuth);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/health", healthRouter);
app.use("/api/v1/treasury", treasuryRouter);
app.use("/api/v1/stablecoin", stablecoinRouter);
app.use("/api/v1/supply", supplyRouter);
app.use("/api/v1", operationsRouter);
app.use("/api/v1/compliance", complianceRouter);
app.use("/api/v1/kyc", kycRouter);
app.use("/api/v1/travel-rule", travelRuleRouter);
app.use("/api/v1/roles", rolesRouter);
app.use("/api/v1", eventsRouter);

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// ---------------------------------------------------------------------------
// Error handler (must be last)
// ---------------------------------------------------------------------------

app.use(errorHandler);

export default app;
