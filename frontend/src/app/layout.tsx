import type { Metadata } from 'next';
import '@/styles/globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: {
    default: 'SourceChain — Verifiable Journalism on GenLayer',
    template: '%s | SourceChain',
  },
  description:
    'SourceChain uses GenLayer AI consensus to verify article citations in real-time, ' +
    'fetching source URLs on-chain and detecting AI-generated content — creating immutable proof of journalistic integrity.',
  keywords: [
    'GenLayer',
    'blockchain',
    'journalism',
    'fact-checking',
    'AI verification',
    'decentralized',
    'source verification',
  ],
  authors: [{ name: 'SourceChain' }],
  openGraph: {
    title: 'SourceChain — Verifiable Journalism on GenLayer',
    description: 'AI-powered citation verification, impossible without GenLayer.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
