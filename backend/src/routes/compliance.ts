import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  addToBlacklist,
  removeFromBlacklist,
  checkBlacklist,
  seizeTokens,
} from "../services/compliance";
import { createError } from "../middleware/error";

const router = Router();

function toPubkey(value: string, fieldName: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw createError(`Invalid ${fieldName} address`, 400);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/compliance/blacklist — add to blacklist
// ---------------------------------------------------------------------------

router.post(
  "/blacklist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mint, address, reason } = req.body;
      if (!mint || !address) {
        throw createError("mint and address are required", 400);
      }

      const mintPubkey = toPubkey(mint, "mint");
      const addressPubkey = toPubkey(address, "address");
      const reasonStr = reason || "No reason provided";

      const signature = await addToBlacklist(
        mintPubkey,
        addressPubkey,
        reasonStr
      );
      res.json({
        success: true,
        data: { signature, mint, address, reason: reasonStr },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/v1/compliance/blacklist — remove from blacklist
// ---------------------------------------------------------------------------

router.delete(
  "/blacklist",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mint, address } = req.body;
      if (!mint || !address) {
        throw createError("mint and address are required", 400);
      }

      const mintPubkey = toPubkey(mint, "mint");
      const addressPubkey = toPubkey(address, "address");

      const signature = await removeFromBlacklist(mintPubkey, addressPubkey);
      res.json({
        success: true,
        data: { signature, mint, address },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/compliance/blacklist/:mint/:address — check blacklist
// ---------------------------------------------------------------------------

router.get(
  "/blacklist/:mint/:address",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mint = req.params.mint as string;
      const address = req.params.address as string;

      const mintPubkey = toPubkey(mint, "mint");
      const addressPubkey = toPubkey(address, "address");

      const entry = await checkBlacklist(mintPubkey, addressPubkey);
      res.json({
        success: true,
        data: {
          blacklisted: entry !== null && entry.active,
          entry,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/compliance/seize — seize tokens
// ---------------------------------------------------------------------------

router.post(
  "/seize",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mint, sourceAccount, treasuryAccount } = req.body;
      if (!mint || !sourceAccount || !treasuryAccount) {
        throw createError(
          "mint, sourceAccount, and treasuryAccount are required",
          400
        );
      }

      const mintPubkey = toPubkey(mint, "mint");
      const sourcePubkey = toPubkey(sourceAccount, "sourceAccount");
      const treasuryPubkey = toPubkey(treasuryAccount, "treasuryAccount");

      const signature = await seizeTokens(
        mintPubkey,
        sourcePubkey,
        treasuryPubkey
      );
      res.json({
        success: true,
        data: { signature, mint, sourceAccount, treasuryAccount },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
