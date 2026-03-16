import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  mintTokens,
  burnTokens,
  freezeAccount,
  thawAccount,
  pauseStablecoin,
  unpauseStablecoin,
} from "../services/stablecoin";
import { createError } from "../middleware/error";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireBody(body: Record<string, unknown>, ...fields: string[]): void {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      throw createError(`Missing required field: ${field}`, 400);
    }
  }
}

function toPubkey(value: string, fieldName: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw createError(`Invalid ${fieldName} address`, 400);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/mint
// ---------------------------------------------------------------------------

router.post("/mint", async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireBody(req.body, "mint", "recipient", "amount");
    const { mint, recipient, amount } = req.body;

    const mintPubkey = toPubkey(mint, "mint");
    const recipientPubkey = toPubkey(recipient, "recipient");

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw createError("amount must be a positive number", 400);
    }

    const signature = await mintTokens(mintPubkey, recipientPubkey, amount);
    res.json({
      success: true,
      data: { signature, mint, recipient, amount: amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/burn
// ---------------------------------------------------------------------------

router.post("/burn", async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireBody(req.body, "mint", "amount");
    const { mint, amount } = req.body;

    const mintPubkey = toPubkey(mint, "mint");

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw createError("amount must be a positive number", 400);
    }

    const signature = await burnTokens(mintPubkey, amount);
    res.json({
      success: true,
      data: { signature, mint, amount: amount.toString() },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/freeze
// ---------------------------------------------------------------------------

router.post(
  "/freeze",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBody(req.body, "mint", "tokenAccount");
      const { mint, tokenAccount } = req.body;

      const mintPubkey = toPubkey(mint, "mint");
      const tokenAccountPubkey = toPubkey(tokenAccount, "tokenAccount");

      const signature = await freezeAccount(mintPubkey, tokenAccountPubkey);
      res.json({
        success: true,
        data: { signature, mint, tokenAccount },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/thaw
// ---------------------------------------------------------------------------

router.post(
  "/thaw",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBody(req.body, "mint", "tokenAccount");
      const { mint, tokenAccount } = req.body;

      const mintPubkey = toPubkey(mint, "mint");
      const tokenAccountPubkey = toPubkey(tokenAccount, "tokenAccount");

      const signature = await thawAccount(mintPubkey, tokenAccountPubkey);
      res.json({
        success: true,
        data: { signature, mint, tokenAccount },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/pause
// ---------------------------------------------------------------------------

router.post(
  "/pause",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBody(req.body, "mint");
      const { mint } = req.body;

      const mintPubkey = toPubkey(mint, "mint");
      const signature = await pauseStablecoin(mintPubkey);
      res.json({ success: true, data: { signature, mint } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/v1/unpause
// ---------------------------------------------------------------------------

router.post(
  "/unpause",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      requireBody(req.body, "mint");
      const { mint } = req.body;

      const mintPubkey = toPubkey(mint, "mint");
      const signature = await unpauseStablecoin(mintPubkey);
      res.json({ success: true, data: { signature, mint } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
