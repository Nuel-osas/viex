import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { getStablecoinState, getSupplyBreakdown } from "../services/stablecoin";
import { createError } from "../middleware/error";

const router = Router();

/**
 * GET /api/v1/stablecoin/:mint
 * Get stablecoin state
 */
router.get("/:mint", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mint } = req.params;
    if (!mint) throw createError("mint parameter is required", 400);

    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mint);
    } catch {
      throw createError("Invalid mint address", 400);
    }

    const state = await getStablecoinState(mintPubkey);
    res.json({ success: true, data: state });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/supply/:mint
 * Get supply breakdown
 */
router.get(
  "/supply/:mint",
  async (req: Request, res: Response, next: NextFunction) => {
    // This is mounted under /api/v1 so the full path is /api/v1/supply/:mint
    // But since we mount this router at /api/v1/supply in app.ts, it's just /:mint
    next();
  }
);

export default router;
