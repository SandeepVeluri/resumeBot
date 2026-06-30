import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ResumeChat — Let your resume speak for itself',
  description:
    'Share a link. Recruiters chat with your resume. You get hired.',
  openGraph: {
    title: 'ResumeChat',
    description:
      'Share a link. Recruiters chat with your resume. You get hired.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-navy-900 antialiased">{children}</body>
    </html>
  );
}
