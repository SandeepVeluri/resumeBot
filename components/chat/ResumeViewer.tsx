'use client';

interface ResumeViewerProps {
  candidateName: string;
  headline: string | null;
  linkedinUrl: string | null;
  resumeText: string;
  parsedSections: Record<string, string> | null;
}

export function ResumeViewer({
  candidateName,
  headline,
  linkedinUrl,
  resumeText,
  parsedSections,
}: ResumeViewerProps) {
  const hasSections =
    parsedSections && Object.values(parsedSections).some((v) => v && v.trim());

  return (
    <div className="prose-resume max-w-2xl">
      <div className="border-b border-navy-100 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-navy-900 m-0">{candidateName}</h1>
        {headline && (
          <p className="text-navy-600 mt-1 mb-0">{headline}</p>
        )}
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 text-xs text-navy-500 hover:text-navy-700"
          >
            LinkedIn →
          </a>
        )}
      </div>

      {hasSections ? (
        <div className="space-y-4">
          {(['summary', 'experience', 'education', 'projects', 'skills'] as const).map(
            (key) => {
              const value = parsedSections?.[key];
              if (!value || !value.trim()) return null;
              return (
                <section key={key}>
                  <h2 className="capitalize">{key}</h2>
                  <div className="whitespace-pre-wrap text-sm text-navy-800">
                    {value}
                  </div>
                </section>
              );
            },
          )}
        </div>
      ) : (
        <div className="whitespace-pre-wrap text-sm text-navy-800 leading-relaxed">
          {resumeText}
        </div>
      )}
    </div>
  );
}
