import type { Metadata } from 'next';
import { ChatRoom } from '@/components/chat/ChatRoom';

export const metadata: Metadata = { title: 'Chat - ZAO OS' };

export default function ChatPage() {
  return <ChatRoom />;
}
