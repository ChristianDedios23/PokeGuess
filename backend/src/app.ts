import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { routes } from "./routes/index";
import { logger } from "./middleware/logger";
const app = express();

const corsOrigins =
  process.env.CORS_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? (process.env.NODE_ENV !== "production" ? ["http://localhost:3001"] : []);

// Application-level middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(logger);
app.use(routes);

// 404 handler — must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

export { app };
