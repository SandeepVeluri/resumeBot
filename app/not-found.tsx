import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50 p-6">
      <div className="max-w-md rounded-xl border border-navy-100 bg-white p-8 text-center shadow-sm">
        <p className="font-mono text-xs text-navy-500">404</p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900">
          That page doesn't exist
        </h1>
        <p className="mt-2 text-sm text-navy-600">
          The link you followed may be broken, or the candidate hasn't set up
          their chatbot yet.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-md bg-navy-900 px-4 py-2 text-sm text-white hover:bg-navy-800"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
