import { createSupabaseServiceClient } from './supabase/service';
import { generateEmbedding } from './embeddings';

export interface RetrievedChunk {
  content: string;
  similarity: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  lowConfidence: boolean;
}

const SIMILARITY_THRESHOLD = 0.75;
const MATCH_COUNT = 5;

export async function retrieveRelevantChunks(
  question: string,
  userId: string,
): Promise<RetrievalResult> {
  const supabase = createSupabaseServiceClient();
  const questionEmbedding = await generateEmbedding(question);

  const { data, error } = await supabase.rpc('match_resume_chunks', {
    query_embedding: questionEmbedding,
    match_user_id: userId,
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const chunks = (data ?? []) as RetrievedChunk[];
  if (chunks.length === 0) {
    // Fallback: return single-chunk resume when the resume is short and no embedding match
    const { data: fallback } = await supabase
      .from('resume_chunks')
      .select('content')
      .eq('user_id', userId)
      .order('chunk_index', { ascending: true })
      .limit(3);

    if (fallback && fallback.length > 0 && fallback.length <= 2) {
      return {
        chunks: fallback.map((r) => ({
          content: r.content as string,
          similarity: 1,
        })),
        lowConfidence: false,
      };
    }
    return { chunks: [], lowConfidence: true };
  }

  return { chunks, lowConfidence: false };
}

export async function getProjectLinkSummaries(userId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from('project_links')
    .select('type, url, scraped_content')
    .eq('user_id', userId);

  if (!data || data.length === 0) return 'No project links provided.';

  return data
    .map((l) => {
      const content = (l.scraped_content as string | null)?.slice(0, 400) ?? '';
      return `- [${l.type}] ${l.url}\n  ${content}`;
    })
    .join('\n');
}
