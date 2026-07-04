import express, { Request, Response } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import YAML from "yaml";
import { apiReference } from "@scalar/express-api-reference";
import { routes } from "./routes/index";
import { logger } from "./middleware/logger";
const app = express();

const corsOrigins =
  process.env.CORS_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? (process.env.NODE_ENV !== "production" ? ["http://localhost:3001"] : []);

// Application-level middleware
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

// OpenAPI documentation
const specPath = path.join(__dirname, "..", "openapi.yaml");
const spec = YAML.parse(fs.readFileSync(specPath, "utf8"));
app.get("/openapi.json", (_req: Request, res: Response) => {
  res.json(spec);
});
app.use("/api-docs", apiReference({ spec: { url: "/openapi.json" } }));
app.use(routes);

// 404 handler — must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

export { app };
