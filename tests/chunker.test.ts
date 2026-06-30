import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, shouldChunk, estimateTokens } from '../lib/chunker';

describe('chunker', () => {
  it('returns an empty array for empty input', () => {
    assert.deepEqual(chunkText(''), []);
    assert.deepEqual(chunkText('   '), []);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Hello world, I am John.');
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].index, 0);
  });

  it('splits long text into multiple chunks with overlap', () => {
    const word = 'lorem ';
    const text = word.repeat(2000); // ~12k chars, >> 3000 tokens
    const chunks = chunkText(text, 500, 50);
    assert.ok(chunks.length > 1, 'expected multiple chunks');
    chunks.forEach((c, i) => assert.equal(c.index, i));

    // The second chunk should start with some words from the end of the first
    // (overlap).
    const firstEnd = chunks[0].content.split(' ').slice(-5).join(' ');
    assert.ok(
      chunks[1].content.startsWith(firstEnd.split(' ')[0]),
      'overlap not applied',
    );
  });

  it('shouldChunk is false for small text, true for large', () => {
    assert.equal(shouldChunk('short'), false);
    const big = 'x'.repeat(20_000);
    assert.equal(shouldChunk(big), true);
  });

  it('estimateTokens is roughly chars / 4', () => {
    assert.equal(estimateTokens('abcd'), 1);
    assert.equal(estimateTokens('abcdefgh'), 2);
  });
});
