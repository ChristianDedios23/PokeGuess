import { Request, Response, NextFunction } from "express";

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = performance.now();

  res.on("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${durationMs}ms)`,
    );
  });

  next();
};
