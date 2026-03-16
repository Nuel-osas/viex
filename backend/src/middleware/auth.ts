import { Request, Response, NextFunction } from "express";
import { API_KEY } from "../config";

/**
 * Optional API key authentication middleware.
 * If API_KEY is set in env, requests must include a matching X-API-Key header.
 * If API_KEY is empty/unset, all requests pass through.
 */
export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!API_KEY) {
    next();
    return;
  }

  const provided = req.headers["x-api-key"];
  if (!provided || provided !== API_KEY) {
    res.status(401).json({
      success: false,
      error: "Unauthorized: invalid or missing API key",
    });
    return;
  }

  next();
}
