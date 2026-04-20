import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationMessages } from '../lib/conversation';

describe('buildConversationMessages', () => {
  it('returns a single user message when history is empty', () => {
    const out = buildConversationMessages([], 'Hello');
    assert.deepEqual(out, [{ role: 'user', content: 'Hello' }]);
  });

  it('preserves a clean alternating history', () => {
    const out = buildConversationMessages(
      [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ],
      'Q2',
    );
    assert.deepEqual(out, [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
    ]);
  });

  it('drops a trailing stored user turn so we never send two user turns in a row', () => {
    // The assistant reply for Q1 failed to persist, so only user(Q1) is stored.
    const out = buildConversationMessages(
      [{ role: 'user', content: 'Q1' }],
      'Q2',
    );
    assert.deepEqual(out, [{ role: 'user', content: 'Q2' }]);
  });

  it('collapses consecutive assistant turns', () => {
    const out = buildConversationMessages(
      [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1a' },
        { role: 'assistant', content: 'A1b' },
      ],
      'Q2',
    );
    assert.deepEqual(out, [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1b' },
      { role: 'user', content: 'Q2' },
    ]);
  });

  it('trims leading assistant turns', () => {
    const out = buildConversationMessages(
      [
        { role: 'assistant', content: 'hello' },
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: 'A1' },
      ],
      'Q2',
    );
    assert.deepEqual(out, [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
    ]);
  });

  it('drops messages whose content is empty', () => {
    const out = buildConversationMessages(
      [
        { role: 'user', content: 'Q1' },
        { role: 'assistant', content: '   ' },
      ],
      'Q2',
    );
    assert.deepEqual(out, [{ role: 'user', content: 'Q2' }]);
  });
});
