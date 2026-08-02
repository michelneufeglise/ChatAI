export type MessagePlatform = 'whatsapp' | 'telegram' | 'ai';

export interface Message {
  id: string;
  conversationId: string;
  platform: MessagePlatform;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  platforms: MessagePlatform[];
  avatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  members?: ConversationMember[];
}

export interface ConversationMember {
  id: string;
  name: string;
  avatar?: string;
  platform: MessagePlatform;
}

export interface OllamaResponse {
  response: string;
  model: string;
  createdAt: Date;
  doneReason?: string;
}
