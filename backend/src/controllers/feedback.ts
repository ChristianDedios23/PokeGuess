import { Request, Response } from "express";
import { createFeedbackReport } from "../db/feedback";
import type { FeedbackCategory } from "../db/types";

const CATEGORIES: FeedbackCategory[] = ["bug", "feedback", "visual"];
const MAX_MESSAGE_LENGTH = 2000;
const MAX_POKEMON_REF_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

function isCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}

export const submitFeedback = async (req: Request, res: Response) => {
  const { category, message, pokemonRef, email } = req.body ?? {};

  if (!isCategory(category)) {
    return res.status(400).json({ error: "category must be one of bug, feedback, visual" });
  }

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` });
  }

  if (pokemonRef !== undefined) {
    if (typeof pokemonRef !== "string" || pokemonRef.length > MAX_POKEMON_REF_LENGTH) {
      return res.status(400).json({ error: "pokemonRef is invalid" });
    }
  }

  if (email !== undefined) {
    if (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({ error: "email is invalid" });
    }
  }

  try {
    const report = await createFeedbackReport({
      category,
      message: message.trim(),
      pokemonRef: pokemonRef?.trim() || undefined,
      email: email?.trim() || undefined,
    });
    res.status(201).json({ id: report.id });
  } catch (error) {
    console.error("Failed to save feedback report:", error);
    res.status(503).json({ error: "Unable to save feedback right now. Please try again later." });
  }
};
