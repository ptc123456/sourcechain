import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { WalletProvider } from '@/components/WalletProvider';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

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
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body>
        <WalletProvider>
          <a className="skip-link" href="#main-content">Skip to main content</a>
          <Navbar />
          <main id="main-content" tabIndex={-1}>{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
