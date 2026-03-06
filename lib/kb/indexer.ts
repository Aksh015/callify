import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { ensureKbDirs, getKbUploadsDir, saveKbIndex } from "./storage";
import type { KBChunk, KBIndex } from "./types";

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function chunkText(text: string, sourceFile: string, size = 800, overlap = 120) {
  const chunks: KBChunk[] = [];
  if (!text) return chunks;

  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(text.length, start + size);
    const part = cleanText(text.slice(start, end));
    if (part.length > 0) {
      chunks.push({
        id: randomUUID(),
        sourceFile,
        text: part,
        index,
      });
      index += 1;
    }
    if (end === text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

async function extractText(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (ext === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return cleanText(parsed.text || "");
  }

  if (ext === ".txt" || ext === ".csv") {
    return cleanText(buffer.toString("utf-8"));
  }

  return "";
}

export async function ingestKnowledgeBase(knowledgeBaseId: string, files: File[]) {
  await ensureKbDirs(knowledgeBaseId);

  const allChunks: KBChunk[] = [];

  for (const file of files) {
    const uploadPath = path.join(getKbUploadsDir(knowledgeBaseId), file.name);
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(uploadPath, Buffer.from(arrayBuffer));

    const extracted = await extractText(file);
    const chunks = chunkText(extracted, file.name);
    allChunks.push(...chunks);
  }

  const index: KBIndex = {
    knowledgeBaseId,
    createdAt: new Date().toISOString(),
    chunks: allChunks,
  };

  await saveKbIndex(index);
  return {
    filesProcessed: files.length,
    chunksCreated: allChunks.length,
  };
}
