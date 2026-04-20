import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  detectFileType,
  extractResumeText,
  parseSections,
} from '@/lib/extract';
import { embedAndStoreResume } from '@/lib/embeddings';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const STORAGE_BUCKET = 'resumes';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 5MB.' },
        { status: 400 },
      );
    }

    const fileType = detectFileType(file.type, file.name);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF or DOCX.' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText: string;
    try {
      rawText = await extractResumeText(buffer, fileType);
    } catch (err) {
      return NextResponse.json(
        {
          error: `Could not extract text: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        },
        { status: 400 },
      );
    }

    if (rawText.length < 50) {
      return NextResponse.json(
        { error: 'Resume appears to be empty or unreadable.' },
        { status: 400 },
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            'Server is missing OPENAI_API_KEY. Set it in .env.local and restart the dev server before uploading.',
        },
        { status: 500 },
      );
    }

    const service = createSupabaseServiceClient();

    // Upload file to storage (best effort; continue if bucket not ready).
    let fileUrl: string | null = null;
    const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const upload = await service.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || (fileType === 'pdf' ? 'application/pdf' : ''),
        upsert: true,
      });
    if (!upload.error) {
      const { data: signed } = await service.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365);
      fileUrl = signed?.signedUrl ?? null;
    }

    // Deactivate previous active resumes.
    await service
      .from('resumes')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const parsedSections = parseSections(rawText);

    const { data: resumeRow, error: insertErr } = await service
      .from('resumes')
      .insert({
        user_id: user.id,
        file_url: fileUrl,
        raw_text: rawText,
        parsed_sections: parsedSections,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertErr || !resumeRow) {
      return NextResponse.json(
        { error: `Failed to save resume: ${insertErr?.message}` },
        { status: 500 },
      );
    }

    // Clean up old chunks for this user.
    await service.from('resume_chunks').delete().eq('user_id', user.id);

    let chunkCount = 0;
    try {
      const result = await embedAndStoreResume({
        resumeId: resumeRow.id,
        userId: user.id,
        rawText,
      });
      chunkCount = result.chunkCount;
    } catch (err) {
      // Roll back the resume row so the dashboard doesn't show an indexed
      // resume that the chat API can't actually answer against.
      await service.from('resume_chunks').delete().eq('resume_id', resumeRow.id);
      await service.from('resumes').delete().eq('id', resumeRow.id);
      return NextResponse.json(
        {
          error: `Indexing failed: ${
            err instanceof Error ? err.message : 'unknown'
          }. Resume was not saved — fix the error and retry.`,
        },
        { status: 500 },
      );
    }

    if (chunkCount === 0) {
      await service.from('resumes').delete().eq('id', resumeRow.id);
      return NextResponse.json(
        { error: 'Indexing produced no chunks. Resume was not saved.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      resumeId: resumeRow.id,
      chunkCount,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
