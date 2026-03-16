import { Router, Request, Response, NextFunction } from "express";
import { PublicKey } from "@solana/web3.js";
import {
  program,
  connection,
  findTreasuryPda,
  operatorKeypair,
} from "../config";
import { getStablecoinState } from "../services/stablecoin";
import { createError } from "../middleware/error";

const router = Router();

/**
 * GET /api/v1/treasury
 * Get treasury state for the operator's treasury
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorityOverride = req.query.authority as string | undefined;
    const authority = authorityOverride
      ? new PublicKey(authorityOverride)
      : operatorKeypair.publicKey;

    const [treasuryPda] = findTreasuryPda(authority);

    const account = await (program.account as any).treasury.fetch(treasuryPda);

    res.json({
      success: true,
      data: {
        address: treasuryPda.toBase58(),
        authority: account.authority.toBase58(),
        name: account.name,
        baseCurrency: account.baseCurrency,
        mints: account.mints.map((m: PublicKey) => m.toBase58()),
        travelRuleThreshold: account.travelRuleThreshold.toString(),
        kycRequired: account.kycRequired,
        createdAt: account.createdAt.toNumber(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/treasury/mints
 * List registered mints with supply info
 */
router.get("/mints", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorityOverride = req.query.authority as string | undefined;
    const authority = authorityOverride
      ? new PublicKey(authorityOverride)
      : operatorKeypair.publicKey;

    const [treasuryPda] = findTreasuryPda(authority);
    const treasury = await (program.account as any).treasury.fetch(treasuryPda);

    const mints = [];
    for (const mintPubkey of treasury.mints) {
      try {
        const state = await getStablecoinState(mintPubkey);
        let currentSupply = "0";
        try {
          const supplyInfo = await connection.getTokenSupply(mintPubkey);
          currentSupply = supplyInfo.value.amount;
        } catch {
          // mint may not exist on-chain yet
        }
        mints.push({
          ...state,
          currentSupply,
        });
      } catch {
        mints.push({
          mint: mintPubkey.toBase58(),
          error: "Failed to fetch stablecoin state",
        });
      }
    }

    res.json({
      success: true,
      data: { mints },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
