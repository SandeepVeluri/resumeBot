import type { ClaudeMessage } from './claude';

/**
 * Build the Claude message array from (chronologically ordered) history + the
 * new user message, enforcing the two invariants Anthropic requires:
 *   1. The array starts with a `user` role.
 *   2. Roles strictly alternate.
 *
 * If the stored history ever drifts (e.g. a prior assistant reply failed to
 * persist), we prune it so the final payload is still valid. The new user
 * message is always appended last.
 */
export function buildConversationMessages(
  history: ClaudeMessage[],
  newUserMessage: string,
): ClaudeMessage[] {
  const normalized: ClaudeMessage[] = [];
  for (const msg of history) {
    const role: 'user' | 'assistant' = msg.role === 'assistant' ? 'assistant' : 'user';
    const content = (msg.content ?? '').toString().trim();
    if (!content) continue;

    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === role) {
      // Drop the older one to preserve alternation; keep the newer message.
      normalized[normalized.length - 1] = { role, content };
    } else {
      normalized.push({ role, content });
    }
  }

  // Trim any leading assistant turns — payload must start with `user`.
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  // The payload ends with the new user message; drop any trailing stored
  // `user` turn so we don't send two user turns in a row.
  if (
    normalized.length > 0 &&
    normalized[normalized.length - 1].role === 'user'
  ) {
    normalized.pop();
  }

  normalized.push({ role: 'user', content: newUserMessage });
  return normalized;
}
