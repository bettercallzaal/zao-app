import type { Metadata } from 'next';
import { AgentWorkspace } from '@/components/workspace/AgentWorkspace';

export const metadata: Metadata = {
  title: 'Community workspace',
  description: 'Review the ZAO community, save what matters, and prepare your next cast.',
  alternates: {canonical: '/workspace'},
};

export default function WorkspacePage() {
  return <AgentWorkspace />;
}
