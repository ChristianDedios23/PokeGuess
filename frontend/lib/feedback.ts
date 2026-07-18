import { API_BASE } from "./config";

export type FeedbackCategory = "bug" | "feedback" | "visual";

export interface SubmitFeedbackInput {
  category: FeedbackCategory;
  message: string;
  pokemonRef?: string;
  email?: string;
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<void> {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Failed to submit feedback");
  }
}
