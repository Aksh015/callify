import { loadKbIndex } from "./storage";

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreChunk(queryTokens: string[], chunkText: string) {
  const chunkTokens = new Set(tokenize(chunkText));
  let score = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) score += 1;
  }
  return score;
}

export async function searchKnowledgeBase(input: {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
}) {
  const topK = input.topK ?? 3;
  const index = await loadKbIndex(input.knowledgeBaseId);
  if (!index) {
    return {
      found: false,
      answer: "Knowledge base not found for this business.",
      matches: [],
    };
  }

  const queryTokens = tokenize(input.query);
  const ranked = index.chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(queryTokens, chunk.text),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (ranked.length === 0) {
    return {
      found: false,
      answer: "I could not find this information in the uploaded knowledge base.",
      matches: [],
    };
  }

  const answer = ranked.map((item) => item.chunk.text).join(" ");

  return {
    found: true,
    answer,
    matches: ranked.map((item) => ({
      score: item.score,
      sourceFile: item.chunk.sourceFile,
      chunkId: item.chunk.id,
    })),
  };
}
