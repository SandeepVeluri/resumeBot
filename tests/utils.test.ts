import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  isValidUsername,
  generateSessionToken,
  cn,
} from '../lib/utils';

describe('slugify', () => {
  it('lowercases and replaces non-alphanumerics with dashes', () => {
    assert.equal(slugify('John Doe'), 'john-doe');
    assert.equal(slugify('Hello, World!'), 'hello-world');
  });

  it('trims leading/trailing dashes', () => {
    assert.equal(slugify('  --hi--  '), 'hi');
  });

  it('caps at 32 chars', () => {
    const out = slugify('a'.repeat(100));
    assert.ok(out.length <= 32);
  });
});

describe('isValidUsername', () => {
  it('accepts simple usernames', () => {
    assert.equal(isValidUsername('johndoe'), true);
    assert.equal(isValidUsername('john-doe-42'), true);
  });

  it('rejects uppercase, spaces, and reserved characters', () => {
    assert.equal(isValidUsername('JohnDoe'), false);
    assert.equal(isValidUsername('john doe'), false);
    assert.equal(isValidUsername('john_doe'), false);
  });

  it('rejects too-short or too-long usernames', () => {
    assert.equal(isValidUsername('jo'), false);
    assert.equal(isValidUsername('a'.repeat(40)), false);
  });

  it('rejects usernames that start with a dash', () => {
    assert.equal(isValidUsername('-john'), false);
  });
});

describe('generateSessionToken', () => {
  it('returns a 48-char hex string', () => {
    const token = generateSessionToken();
    assert.match(token, /^[0-9a-f]{48}$/);
  });

  it('returns a different token on each call', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    assert.notEqual(a, b);
  });
});

describe('cn', () => {
  it('merges tailwind classes and drops falsy', () => {
    assert.equal(cn('p-2', false && 'hidden', 'p-4'), 'p-4');
  });
});
