import { Router } from "express";
import { submitFeedback } from "../controllers/feedback";

export const feedbackRouter = Router();

feedbackRouter.post("/", submitFeedback);
