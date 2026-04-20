import OpenAI from 'openai';
import { createSupabaseServiceClient } from './supabase/service';
import { chunkText, shouldChunk, type Chunk } from './chunker';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';

export async function generateEmbedding(text: string): Promise<number[]> {
  const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 8000);
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const inputs = texts.map((t) => t.replace(/\s+/g, ' ').trim().slice(0, 8000));
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
  });
  return response.data.map((d) => d.embedding);
}

export interface EmbedAndStoreParams {
  resumeId: string;
  userId: string;
  rawText: string;
}

export async function embedAndStoreResume({
  resumeId,
  userId,
  rawText,
}: EmbedAndStoreParams): Promise<{ chunkCount: number }> {
  const supabase = createSupabaseServiceClient();

  // Clean up existing chunks for this resume
  await supabase.from('resume_chunks').delete().eq('resume_id', resumeId);

  let chunks: Chunk[];
  if (shouldChunk(rawText)) {
    chunks = chunkText(rawText, 500, 50);
  } else {
    chunks = [{ content: rawText.trim(), index: 0 }];
  }

  if (chunks.length === 0) {
    return { chunkCount: 0 };
  }

  // Batch embed (OpenAI allows ~2048 inputs per call; we batch by 64 for safety)
  const batchSize = 64;
  const rows: Array<{
    resume_id: string;
    user_id: string;
    content: string;
    chunk_index: number;
    embedding: number[];
    metadata: Record<string, unknown>;
  }> = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch.map((c) => c.content));
    batch.forEach((chunk, j) => {
      rows.push({
        resume_id: resumeId,
        user_id: userId,
        content: chunk.content,
        chunk_index: chunk.index,
        embedding: embeddings[j],
        metadata: { length: chunk.content.length },
      });
    });
  }

  const { data: inserted, error } = await supabase
    .from('resume_chunks')
    .insert(rows)
    .select('id');

  if (error) {
    throw new Error(
      `Failed to store chunks: ${error.message}${
        error.details ? ` (${error.details})` : ''
      }${error.hint ? ` [hint: ${error.hint}]` : ''}`,
    );
  }

  const actual = inserted?.length ?? 0;
  if (actual !== rows.length) {
    throw new Error(
      `Chunk insert returned no error but only ${actual}/${rows.length} rows were stored. ` +
        `This is almost always RLS silently blocking the insert — your SUPABASE_SERVICE_ROLE_KEY ` +
        `is likely set to the anon key by mistake. In Supabase Dashboard → Settings → API, ` +
        `copy the secret "service_role" key (NOT the "anon public" key) into .env.local and restart.`,
    );
  }

  return { chunkCount: actual };
}
