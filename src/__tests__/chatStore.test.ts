import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@store/chatStore';
import { Message, Conversation } from '/src/types';

const mockConv: Conversation = {
  id: 'conv-1',
  title: 'Test Chat',
  platforms: ['telegram'],
  unreadCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockMsg: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  platform: 'telegram',
  sender: { id: 'user1', name: 'Alice' },
  content: 'Hello!',
  timestamp: new Date('2024-01-01T10:00:00Z'),
  status: 'delivered',
};

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      conversations: [],
      selectedConversationId: null,
      messages: {},
      loading: false,
      error: null,
      offlineQueue: [],
      suggestions: {},
      typingStates: {},
      isOffline: false,
    });
  });

  it('adds a conversation', () => {
    useChatStore.getState().addConversation(mockConv);
    expect(useChatStore.getState().conversations).toHaveLength(1);
    expect(useChatStore.getState().conversations[0].id).toBe('conv-1');
  });

  it('selects a conversation', () => {
    useChatStore.getState().selectConversation('conv-1');
    expect(useChatStore.getState().selectedConversationId).toBe('conv-1');
  });

  it('adds a message to a conversation', () => {
    useChatStore.getState().addMessage('conv-1', mockMsg);
    expect(useChatStore.getState().messages['conv-1']).toHaveLength(1);
    expect(useChatStore.getState().messages['conv-1'][0].content).toBe('Hello!');
  });

  it('enqueues message when offline', () => {
    useChatStore.getState().setOffline(true);
    useChatStore.getState().addToOfflineQueue(mockMsg);
    expect(useChatStore.getState().offlineQueue).toHaveLength(1);
  });

  it('clears offline queue', () => {
    useChatStore.getState().addToOfflineQueue(mockMsg);
    useChatStore.getState().clearOfflineQueue();
    expect(useChatStore.getState().offlineQueue).toHaveLength(0);
  });

  it('sets typing state for a conversation', () => {
    useChatStore.getState().setTypingState('conv-1', true);
    expect(useChatStore.getState().typingStates['conv-1']).toBe(true);
  });

  it('sets AI suggestions for a conversation', () => {
    useChatStore.getState().setSuggestions('conv-1', ['Sure!', 'Let me check', 'No problem']);
    expect(useChatStore.getState().suggestions['conv-1']).toHaveLength(3);
  });

  it('sets messages for a conversation', () => {
    useChatStore.getState().setMessages('conv-1', [mockMsg]);
    expect(useChatStore.getState().messages['conv-1']).toHaveLength(1);
  });

  it('sets loading state', () => {
    useChatStore.getState().setLoading(true);
    expect(useChatStore.getState().loading).toBe(true);
  });

  it('sets error state', () => {
    useChatStore.getState().setError('Test error');
    expect(useChatStore.getState().error).toBe('Test error');
  });
});
