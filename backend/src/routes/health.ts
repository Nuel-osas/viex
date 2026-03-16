import { Router, Request, Response } from "express";
import { connection, VIEX_TREASURY_PROGRAM_ID, operatorKeypair } from "../config";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const slot = await connection.getSlot();
    res.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        slot,
        programId: VIEX_TREASURY_PROGRAM_ID.toBase58(),
        operator: operatorKeypair.publicKey.toBase58(),
      },
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      data: {
        status: "degraded",
        timestamp: new Date().toISOString(),
        error: err.message,
      },
    });
  }
});

export default router;
