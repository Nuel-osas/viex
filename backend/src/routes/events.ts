import { Router, Request, Response, NextFunction } from "express";
import { getEventsForMint, getAuditLog } from "../services/events";
import { createError } from "../middleware/error";

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/events/:mint — get recent events for a mint
// ---------------------------------------------------------------------------

router.get(
  "/events/:mint",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mint = req.params.mint as string;
      if (!mint) throw createError("mint parameter is required", 400);

      const limit = parseInt(req.query.limit as string) || 50;
      const events = getEventsForMint(mint, limit);

      res.json({
        success: true,
        data: { mint, events, count: events.length },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/v1/audit-log — get audit log
// ---------------------------------------------------------------------------

router.get(
  "/audit-log",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const action = req.query.action as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = getAuditLog({ action, limit, offset });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
