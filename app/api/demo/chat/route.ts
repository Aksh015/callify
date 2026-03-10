import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_DEMO_CONTEXT, buildDemoSystemPrompt } from "@/lib/demo-context";
import { createClient } from "@supabase/supabase-js";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// In-memory vector store cache to simulate a Vector DB for RAG
const vectorStoreCache = new Map<string, { chunks: string[], embeddings: number[][] }>();

function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, businessId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    let rawContext = DEFAULT_DEMO_CONTEXT;
    let hotelName: string | undefined;

    if (businessId && supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: business } = await supabase
          .from("businesses")
          .select("demo_context, id")
          .eq("id", businessId)
          .single();
        
        if (business?.demo_context) {
          rawContext = business.demo_context;
        }

        const { data: hotel } = await supabase
          .from("hotels")
          .select("name")
          .eq("business_id", businessId)
          .single();
        
        if (hotel?.name) {
          hotelName = hotel.name;
        }
      } catch (dbErr) {
        console.warn("Failed to fetch custom context, using default:", dbErr);
      }
    }

    // --- RAG (Vector DB Simulation) Start ---
    const contextHash = hashString(rawContext);
    const storeKey = `${businessId || 'default'}_${contextHash}`;
    
    let store = vectorStoreCache.get(storeKey);
    if (!store) {
      // Chunk context by paragraphs or sections
      const chunks = rawContext.split(/(?:\r?\n){2,}/).filter(c => c.trim().length > 0);
      
      try {
        // We will just use the chunks if embedding fails to ensure reliability
        if (chunks.length > 0) {
          const embedRes = await genai.models.embedContent({
            model: "text-embedding-004",
            contents: chunks,
          });
          const embeddingsArray: number[][] = embedRes.embeddings ? embedRes.embeddings.map(e => e.values || []) : [];
          store = { chunks, embeddings: embeddingsArray };
          vectorStoreCache.set(storeKey, store);
        }
      } catch (err) {
        console.warn("Embedding cache generation failed, using raw context directly:", err);
      }
    }

    let retrievedContext = rawContext; // Fallback to raw full context

    if (store && store.embeddings.length > 0) {
      try {
        // Embed the query
        const queryRes = await genai.models.embedContent({
          model: "text-embedding-004",
          contents: [message],
        });
        const queryEmbedding = queryRes.embeddings?.[0]?.values || [];
        
        if (queryEmbedding.length > 0) {
          // Calculate similarities
          const scored = store.chunks.map((chunk, i) => ({
            chunk,
            score: cosineSimilarity(queryEmbedding, store!.embeddings[i])
          }));
          
          // Sort by highest similarity
          scored.sort((a, b) => b.score - a.score);
          
          // Take top 5 most relevant chunks (or fewer if fewer chunks exist)
          const topChunks = scored.slice(0, 5).map(s => s.chunk);
          retrievedContext = topChunks.join("\n\n---\n\n");
        }
      } catch (e) {
        console.warn("Query embedding failed, falling back to full context RAG fallback", e);
      }
    }
    // --- RAG (Vector DB Simulation) End ---

    // Build the system prompt with retrieved context
    const systemPrompt = buildDemoSystemPrompt(retrievedContext, hotelName);

    const chatHistory = (history || []).map((msg: { role: string; text: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Call Gemini API
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1, // Very low temperature for high context adherence
        maxOutputTokens: 1024,
      },
    });

    const aiText = response?.text || "I am unable to understand what you want to ask, please ask something from the context provided.";

    return NextResponse.json({ response: aiText });
  } catch (err: any) {
    console.error("Demo chat error:", err);
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
