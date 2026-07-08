import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Submit Article for Verification',
  description:
    'Submit your article to SourceChain for AI-powered citation verification. ' +
    'GenLayer reads your source URLs on-chain and provides an immutable verification verdict.',
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
