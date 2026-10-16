import type { Metadata } from 'next';
import { ChatRoom } from '@/components/chat/ChatRoom';

export const metadata: Metadata = { title: 'Chat' };

export default function ChatPage() {
  return <ChatRoom />;
}
