import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectFileType, parseSections } from '../lib/extract';

describe('detectFileType', () => {
  it('detects PDF by MIME and by extension', () => {
    assert.equal(detectFileType('application/pdf', 'cv.pdf'), 'pdf');
    assert.equal(detectFileType('', 'Resume.PDF'), 'pdf');
  });

  it('detects DOCX by MIME and by extension', () => {
    assert.equal(
      detectFileType(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'cv.docx',
      ),
      'docx',
    );
    assert.equal(detectFileType('', 'Resume.DOCX'), 'docx');
  });

  it('returns null for unsupported types', () => {
    assert.equal(detectFileType('text/plain', 'cv.txt'), null);
    assert.equal(detectFileType('', 'cv.doc'), null);
  });
});

describe('parseSections', () => {
  it('parses common resume section headings', () => {
    const text = `Summary
Passionate engineer with 10 years of experience.

Experience
Acme Corp — Senior SWE
Led a team of 5.

Education
MIT, B.S. Computer Science
`;
    const sections = parseSections(text);
    assert.ok(sections.summary?.includes('Passionate engineer'));
    assert.ok(sections.experience?.includes('Acme Corp'));
    assert.ok(sections.education?.includes('MIT'));
  });

  it('returns empty object when no sections found', () => {
    assert.deepEqual(parseSections('just one big paragraph with no headings'), {});
  });
});
