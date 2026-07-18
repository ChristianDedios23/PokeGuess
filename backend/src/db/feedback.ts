import { randomUUID } from "crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "./client";
import { FEEDBACK_TABLE } from "./tables";
import type { FeedbackCategory, FeedbackReport } from "./types";

export interface CreateFeedbackReportInput {
  category: FeedbackCategory;
  message: string;
  pokemonRef?: string;
  email?: string;
}

export async function createFeedbackReport(
  input: CreateFeedbackReportInput,
): Promise<FeedbackReport> {
  const report: FeedbackReport = {
    id: randomUUID(),
    category: input.category,
    message: input.message,
    pokemonRef: input.pokemonRef,
    email: input.email,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: FEEDBACK_TABLE,
      Item: report,
    }),
  );

  return report;
}
