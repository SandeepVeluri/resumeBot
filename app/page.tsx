import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignInButton } from '@/components/auth/SignInButton';

export default async function LandingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-navy-50 to-white text-navy-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-white">
            R
          </span>
          ResumeChat
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <a href="#how" className="text-navy-700 hover:text-navy-900">
            How it works
          </a>
          <a href="#demo" className="text-navy-700 hover:text-navy-900">
            Example
          </a>
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-navy-900 px-4 py-2 text-white hover:bg-navy-800"
            >
              Dashboard
            </Link>
          ) : (
            <SignInButton label="Sign in" variant="secondary" />
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-12 pb-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-navy-100 bg-white/60 px-4 py-1.5 text-xs text-navy-700 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse-slow" />
          Powered by Claude — answers only from your resume
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-navy-900 md:text-6xl">
          Let your resume <span className="text-navy-700">speak for itself</span>.
        </h1>
        <p className="mt-5 text-lg text-navy-600 md:text-xl">
          Share a link. Recruiters chat with your resume. You get hired.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-navy-900 px-6 py-3 text-white font-medium hover:bg-navy-800"
            >
              Go to dashboard →
            </Link>
          ) : (
            <SignInButton label="Create your free resume chatbot" size="lg" />
          )}
          <a
            href="#how"
            className="rounded-md border border-navy-200 bg-white px-6 py-3 font-medium text-navy-900 hover:bg-navy-50"
          >
            See how it works
          </a>
        </div>

        <div id="demo" className="mt-12 rounded-xl border border-navy-100 bg-white p-5 shadow-sm mx-auto max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-navy-500">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="ml-auto font-mono">
              resumechat.vercel.app/chat/johndoe
            </span>
          </div>
          <div className="mt-4 text-left">
            <div className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold">
                R
              </div>
              <div className="rounded-lg bg-navy-50 px-3 py-2 text-sm">
                <p className="font-semibold">John Doe · Senior SWE</p>
                <p className="text-navy-700">Ask me anything about John's experience.</p>
              </div>
            </div>
            <div className="mt-3 flex gap-3 justify-end">
              <div className="rounded-lg bg-navy-900 px-3 py-2 text-sm text-white">
                What are John's strongest skills?
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold">
                R
              </div>
              <div className="rounded-lg bg-navy-50 px-3 py-2 text-sm">
                Based on his resume, John's strongest skills include:
                <ul className="list-disc pl-5 mt-1">
                  <li>TypeScript &amp; distributed systems</li>
                  <li>Leading cross-functional teams of 5+ engineers</li>
                  <li>Shipping ML-powered features at scale</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-navy-900">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              icon: '📄',
              title: 'Upload your resume',
              body: 'PDF or DOCX. We parse it, extract every section, and index it for search.',
            },
            {
              step: '02',
              icon: '🔗',
              title: 'Add your project links',
              body: 'GitHub, Medium, Figma, personal site — we scrape them and include them in context.',
            },
            {
              step: '03',
              icon: '💬',
              title: 'Share your chatbot',
              body: 'Post the link on LinkedIn, in your email, or on your site. Recruiters chat with your resume.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xs font-mono text-navy-400">{s.step}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-navy-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pt-4 pb-20 text-center">
        <h2 className="text-2xl font-bold text-navy-900">
          Your link looks like this
        </h2>
        <p className="mt-3 text-navy-600">
          Easy to remember. Easy to share. Impossible to ignore.
        </p>
        <div className="mt-5 inline-block rounded-lg border border-navy-100 bg-white px-5 py-3 font-mono text-navy-800">
          resumechat.vercel.app/chat/
          <span className="text-navy-900 font-bold">yourname</span>
        </div>
      </section>

      <footer className="border-t border-navy-100 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-navy-500 md:flex-row">
          <p>© {new Date().getFullYear()} ResumeChat</p>
          <p>
            Built with Next.js, Supabase &amp; Claude. Answers only from your resume.
          </p>
        </div>
      </footer>
    </main>
  );
}
