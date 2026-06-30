import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectLinkType } from '../lib/scraper';

describe('detectLinkType', () => {
  it('classifies GitHub URLs', () => {
    assert.equal(detectLinkType('https://github.com/torvalds'), 'github');
    assert.equal(
      detectLinkType('https://github.com/torvalds/linux'),
      'github',
    );
  });

  it('classifies Medium and Figma URLs', () => {
    assert.equal(detectLinkType('https://medium.com/@writer'), 'medium');
    assert.equal(detectLinkType('https://www.figma.com/@maker'), 'figma');
  });

  it('falls back to "website" for regular sites', () => {
    assert.equal(detectLinkType('https://example.com/portfolio'), 'website');
  });

  it('returns "other" for malformed URLs', () => {
    assert.equal(detectLinkType('not a url'), 'other');
  });
});
