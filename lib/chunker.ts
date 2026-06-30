const AVG_CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

export interface Chunk {
  content: string;
  index: number;
}

export function chunkText(
  text: string,
  chunkTokenSize = 500,
  overlapTokens = 50,
): Chunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const chunkChars = chunkTokenSize * AVG_CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * AVG_CHARS_PER_TOKEN;

  const words = cleaned.split(' ');
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentLen = 0;
  let index = 0;

  for (const word of words) {
    current.push(word);
    currentLen += word.length + 1;
    if (currentLen >= chunkChars) {
      chunks.push({ content: current.join(' '), index: index++ });
      const overlap: string[] = [];
      let overlapLen = 0;
      for (let i = current.length - 1; i >= 0 && overlapLen < overlapChars; i--) {
        overlap.unshift(current[i]);
        overlapLen += current[i].length + 1;
      }
      current = overlap;
      currentLen = overlapLen;
    }
  }

  if (current.length > 0) {
    chunks.push({ content: current.join(' '), index: index++ });
  }

  return chunks;
}

export function shouldChunk(text: string, threshold = 3000): boolean {
  return estimateTokens(text) > threshold;
}
