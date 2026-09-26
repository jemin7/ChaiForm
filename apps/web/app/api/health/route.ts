import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Minimal health endpoint for smoke tests / uptime checks. Reports whether the
 * AI provider is configured (without leaking the key) so a broken deployment
 * is detectable before a user hits an empty AI response.
 */
export async function GET() {
  const aiConfigured = Boolean(process.env.AI_API_KEY);

  return NextResponse.json({
    status: "ok",
    features: {
      ai: aiConfigured,
      aiModel: process.env.AI_MODEL ?? null,
    },
    timestamp: new Date().toISOString(),
  });
}
