import { invoke } from '@tauri-apps/api/tauri';
import { Message } from '@types/index';

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  try {
    const message = await invoke<Message>('send_message', {
      conversationId,
      content,
    });
    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    const messages = await invoke<Message[]>('get_messages', {
      conversationId,
    });
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

export async function loadConversations() {
  try {
    const conversations = await invoke('get_conversations');
    return conversations;
  } catch (error) {
    console.error('Error loading conversations:', error);
    throw error;
  }
}
