import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { getSupplyBreakdown } from "../services/stablecoin";
import { createError } from "../middleware/error";

const router = Router();

/**
 * GET /api/v1/supply/:mint
 * Get supply breakdown
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

    const breakdown = await getSupplyBreakdown(mintPubkey);
    res.json({ success: true, data: breakdown });
  } catch (err) {
    next(err);
  }
});

export default router;
