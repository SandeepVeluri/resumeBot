import mammoth from 'mammoth';

export type ResumeFileType = 'pdf' | 'docx';

export function detectFileType(mimeType: string, fileName: string): ResumeFileType | null {
  const lowerName = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    return 'docx';
  }
  return null;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // pdf-parse pulls in test fixtures at import time when run from an index;
  // require it dynamically from the library entry to avoid that.
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default as (
    data: Buffer,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return normalizeText(result.text);
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value);
}

export async function extractResumeText(
  buffer: Buffer,
  type: ResumeFileType,
): Promise<string> {
  if (type === 'pdf') return extractTextFromPdf(buffer);
  return extractTextFromDocx(buffer);
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ParsedSections {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
}

const SECTION_HEADINGS: Array<[keyof ParsedSections, RegExp]> = [
  ['summary', /^(summary|profile|about)\b/i],
  ['experience', /^(experience|work experience|employment)\b/i],
  ['education', /^(education|academics)\b/i],
  ['skills', /^(skills|technical skills)\b/i],
  ['projects', /^(projects|personal projects)\b/i],
];

export function parseSections(text: string): ParsedSections {
  const lines = text.split('\n');
  const sections: ParsedSections = {};
  let currentKey: keyof ParsedSections | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentKey && buffer.length > 0) {
      sections[currentKey] = buffer.join('\n').trim();
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const matched = SECTION_HEADINGS.find(([, re]) => re.test(line));
    if (matched && line.length < 40) {
      flush();
      currentKey = matched[0];
      buffer = [];
    } else if (currentKey) {
      buffer.push(rawLine);
    }
  }
  flush();
  return sections;
}
