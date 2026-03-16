import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import { approveKyc, revokeKyc, getKycStatus } from "../services/kyc";
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
// POST /api/v1/kyc/approve
// ---------------------------------------------------------------------------

router.post(
  "/approve",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address, level, jurisdiction, provider, expiresAt } = req.body;

      if (!address || !level || !jurisdiction || !provider || !expiresAt) {
        throw createError(
          "address, level, jurisdiction, provider, and expiresAt are required",
          400
        );
      }

      const addressPubkey = toPubkey(address, "address");

      const signature = await approveKyc(
        addressPubkey,
        level,
        jurisdiction,
        provider,
        Number(expiresAt)
      );

      res.json({
        success: true,
        data: { signature, address, level, jurisdiction, provider, expiresAt },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/kyc/revoke
// ---------------------------------------------------------------------------

router.post(
  "/revoke",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { address } = req.body;
      if (!address) {
        throw createError("address is required", 400);
      }

      const addressPubkey = toPubkey(address, "address");
      const signature = await revokeKyc(addressPubkey);

      res.json({
        success: true,
        data: { signature, address },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/kyc/:address
// ---------------------------------------------------------------------------

router.get(
  "/:address",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.params.address as string;
      const addressPubkey = toPubkey(address, "address");
      const entry = await getKycStatus(addressPubkey);

      res.json({
        success: true,
        data: {
          approved: entry !== null && entry.active,
          entry,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
