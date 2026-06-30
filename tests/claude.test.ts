import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickModel,
  sanitizeUserInput,
  buildSystemPrompt,
} from '../lib/claude';

describe('sanitizeUserInput', () => {
  it('collapses whitespace and trims', () => {
    assert.equal(sanitizeUserInput('  hello   world  '), 'hello world');
  });

  it('returns empty string for whitespace-only input', () => {
    assert.equal(sanitizeUserInput('   \n\t  '), '');
  });

  it('strips control characters', () => {
    assert.equal(sanitizeUserInput('abc\u0007def'), 'abc def');
  });

  it('caps length at 1000 chars', () => {
    const long = 'a'.repeat(5000);
    assert.equal(sanitizeUserInput(long).length, 1000);
  });
});

describe('pickModel', () => {
  it('defaults to Haiku', () => {
    assert.match(pickModel('What skills do they have?'), /haiku/i);
  });

  it('switches to Sonnet on "explain"', () => {
    assert.match(pickModel('Explain their work history'), /sonnet/i);
  });

  it('switches to Sonnet on "summarise"', () => {
    assert.match(pickModel('Please summarise this candidate'), /sonnet/i);
    assert.match(pickModel('Please summarize this candidate'), /sonnet/i);
  });

  it('switches to Sonnet on "describe in detail"', () => {
    assert.match(
      pickModel('Describe in detail their most recent role'),
      /sonnet/i,
    );
  });
});

describe('buildSystemPrompt', () => {
  it('interpolates the candidate name in the strict-rules section', () => {
    const prompt = buildSystemPrompt({
      candidateName: 'Alice',
      resumeChunks: 'some resume text',
      projectSummaries: '- [github] https://github.com/alice',
    });
    assert.ok(prompt.includes('resume assistant for Alice'));
    assert.ok(
      prompt.includes(`"This isn't mentioned in Alice's resume."`),
      'strict refusal line should reference the candidate',
    );
    assert.ok(prompt.includes('some resume text'));
    assert.ok(prompt.includes('github.com/alice'));
  });
});
