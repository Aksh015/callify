import { getSupabaseAdmin } from "@/lib/supabase/admin";

function tokenize(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function scoreText(queryTokens: string[], text: string) {
  const hay = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) score += 1;
  }
  return score;
}

export async function searchBusinessKnowledge(input: { businessProfileId: string; query: string }) {
  const admin = getSupabaseAdmin();

  const { data: chunks, error } = await admin
    .from("kb_chunks")
    .select("content, metadata")
    .eq("business_profile_id", input.businessProfileId)
    .limit(400);

  if (error || !chunks || chunks.length === 0) {
    return {
      found: false,
      answer: "I could not find this information in your uploaded documents.",
      matches: [],
    };
  }

  const queryTokens = tokenize(input.query);
  const ranked = chunks
    .map((chunk) => ({
      text: String(chunk.content || ""),
      score: scoreText(queryTokens, String(chunk.content || "")),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (ranked.length === 0) {
    return {
      found: false,
      answer: "I could not find this information in your uploaded documents.",
      matches: [],
    };
  }

  const answer = ranked.map((item) => item.text).join(" ").slice(0, 1200);

  return {
    found: true,
    answer,
    matches: ranked.map((item) => ({ score: item.score })),
  };
}
