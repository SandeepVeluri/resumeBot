'use client';

const SUGGESTIONS = [
  'Summarise this candidate',
  'What are their strongest skills?',
  'Describe their most recent role',
  'Do they have leadership experience?',
];

export function PromptSuggestions({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          disabled={disabled}
          onClick={() => onPick(s)}
          className="rounded-lg border border-navy-100 bg-white px-3 py-2 text-left text-xs text-navy-700 hover:border-navy-300 hover:bg-navy-50 disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
