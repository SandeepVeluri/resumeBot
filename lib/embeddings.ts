import { GoogleGenAI } from '@google/genai';
import { createSupabaseServiceClient } from './supabase/service';
import { chunkText, shouldChunk, type Chunk } from './chunker';

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

const EMBEDDING_MODEL = 'gemini-embedding-001';
// Matches the vector(1536) column on resume_chunks. gemini-embedding-001
// supports Matryoshka truncation via outputDimensionality; Google recommends
// L2-normalizing the result whenever you request less than the native 3072.
const EMBEDDING_DIM = 1536;
const MAX_INPUT_CHARS = 8000;

function normalize(values: number[]): number[] {
  let sumSq = 0;
  for (const v of values) sumSq += v * v;
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

function clip(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: clip(text),
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Gemini returned no embedding values');
  }
  return normalize(values);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const inputs = texts.map(clip);
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: inputs,
    config: { outputDimensionality: EMBEDDING_DIM },
  });
  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== inputs.length) {
    throw new Error(
      `Gemini returned ${embeddings?.length ?? 0} embeddings for ${inputs.length} inputs`,
    );
  }
  return embeddings.map((e) => {
    if (!e.values || e.values.length === 0) {
      throw new Error('Gemini returned an embedding with no values');
    }
    return normalize(e.values);
  });
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

  // Gemini's batch embed accepts up to 100 inputs per call; we batch by 64 to
  // stay comfortably under the limit and keep payload sizes reasonable.
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
        `is likely set to the anon / publishable key by mistake. In Supabase Dashboard → Settings → API, ` +
        `copy the secret key ("sb_secret_..." on new projects, or the legacy "service_role" JWT) into .env.local and restart.`,
    );
  }

  return { chunkCount: actual };
}
