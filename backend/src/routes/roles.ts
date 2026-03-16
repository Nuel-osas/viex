import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { assignRole, revokeRole } from "../services/stablecoin";
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
// POST /api/v1/roles/assign
// ---------------------------------------------------------------------------

router.post(
  "/assign",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mint, role, address } = req.body;
      if (!mint || !role || !address) {
        throw createError("mint, role, and address are required", 400);
      }

      const mintPubkey = toPubkey(mint, "mint");
      const addressPubkey = toPubkey(address, "address");

      const signature = await assignRole(mintPubkey, role, addressPubkey);
      res.json({
        success: true,
        data: { signature, mint, role, address },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/roles/revoke
// ---------------------------------------------------------------------------

router.post(
  "/revoke",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { mint, role, address } = req.body;
      if (!mint || !role || !address) {
        throw createError("mint, role, and address are required", 400);
      }

      const mintPubkey = toPubkey(mint, "mint");
      const addressPubkey = toPubkey(address, "address");

      const signature = await revokeRole(mintPubkey, role, addressPubkey);
      res.json({
        success: true,
        data: { signature, mint, role, address },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
