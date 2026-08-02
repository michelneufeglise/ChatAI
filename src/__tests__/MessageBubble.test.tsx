import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MessageBubble from '@components/MessageBubble';
import { Message } from '/src/types';

const baseMsg: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  platform: 'telegram',
  sender: { id: 'alice', name: 'Alice' },
  content: 'Hello world',
  timestamp: new Date('2024-01-01T10:00:00Z'),
  status: 'delivered',
};

describe('MessageBubble', () => {
  it('renders sender name', () => {
    const { getByText } = render(<MessageBubble message={baseMsg} />);
    expect(getByText('Alice')).toBeInTheDocument();
  });

  it('renders message content', () => {
    const { getByText } = render(<MessageBubble message={baseMsg} />);
    expect(getByText('Hello world')).toBeInTheDocument();
  });

  it('shows platform badge for non-user messages', () => {
    const { getByText } = render(<MessageBubble message={baseMsg} />);
    expect(getByText('✈️ Telegram')).toBeInTheDocument();
  });

  it('hides platform badge for user messages', () => {
    const userMsg: Message = { ...baseMsg, sender: { id: 'user', name: 'You' } };
    const { queryByText } = render(<MessageBubble message={userMsg} />);
    expect(queryByText('✈️ Telegram')).not.toBeInTheDocument();
  });

  it('applies ai class for AI messages', () => {
    const aiMsg: Message = {
      ...baseMsg,
      platform: 'ai',
      sender: { id: 'ai', name: 'ChatAI' },
    };
    const { container } = render(<MessageBubble message={aiMsg} />);
    expect(container.querySelector('.message-bubble.ai')).not.toBeNull();
  });

  it('applies user class for non-AI messages', () => {
    const { container } = render(<MessageBubble message={baseMsg} />);
    expect(container.querySelector('.message-bubble.user')).not.toBeNull();
  });

  it('renders a timestamp', () => {
    const { container } = render(<MessageBubble message={baseMsg} />);
    expect(container.querySelector('.timestamp')).not.toBeNull();
  });

  it('renders avatar when provided', () => {
    const msgWithAvatar: Message = {
      ...baseMsg,
      sender: { id: 'alice', name: 'Alice', avatar: 'https://example.com/avatar.png' },
    };
    const { getByAltText } = render(<MessageBubble message={msgWithAvatar} />);
    expect(getByAltText('Alice')).toBeInTheDocument();
  });
});
