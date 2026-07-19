import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitFeedback } from "../controllers/feedback";

export const feedbackRouter = Router();

const feedbackLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: { error: "Too many requests, please try again later." },
});

feedbackRouter.use(feedbackLimiter);
feedbackRouter.post("/", submitFeedback);
