import { invoke } from '@tauri-apps/api/tauri';

export interface PlatformSetup {
  name: 'telegram' | 'whatsapp';
  configured: boolean;
  ready: boolean;
  status: string;
}

export interface PlatformMessage {
  id: string;
  conversationId: string;
  platform: 'telegram' | 'whatsapp' | 'ai';
  sender: {
    id: string;
    name: string;
  };
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

// Telegram Integration
export async function authenticateTelegram(): Promise<string> {
  try {
    const result = await invoke<string>('telegram_authenticate');
    return result;
  } catch (error) {
    throw new Error(`Telegram auth failed: ${error}`);
  }
}

export async function getTelegramUpdates(): Promise<PlatformMessage[]> {
  try {
    const updates = await invoke<Record<string, unknown>[]>('telegram_get_updates');
    return updates.map((msg) => ({
      id: String(msg.message_id),
      conversationId: `tg_${msg.sender}`,
      platform: 'telegram',
      sender: {
        id: String(msg.sender),
        name: String(msg.sender),
      },
      content: String(msg.text || ''),
      timestamp: new Date(Number(msg.timestamp) * 1000),
      status: 'delivered',
    }));
  } catch (error) {
    throw new Error(`Failed to get Telegram updates: ${error}`);
  }
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<string> {
  try {
    const result = await invoke<string>('telegram_send_message', { chatId, text });
    return result;
  } catch (error) {
    throw new Error(`Failed to send Telegram message: ${error}`);
  }
}

// WhatsApp Integration
export async function authenticateWhatsApp(): Promise<string> {
  try {
    const result = await invoke<string>('whatsapp_authenticate');
    return result;
  } catch (error) {
    throw new Error(`WhatsApp auth failed: ${error}`);
  }
}

export async function checkWhatsAppAuthentication(): Promise<boolean> {
  try {
    return await invoke<boolean>('whatsapp_is_authenticated');
  } catch (error) {
    console.error('Failed to check WhatsApp auth:', error);
    return false;
  }
}

export async function getWhatsAppSetupGuide(): Promise<string> {
  try {
    return await invoke<string>('get_whatsapp_setup_guide');
  } catch (error) {
    throw new Error(`Failed to get WhatsApp setup guide: ${error}`);
  }
}

// Message Routing
export async function routeOutgoingMessage(
  platform: 'telegram' | 'whatsapp',
  conversationId: string,
  content: string
): Promise<PlatformMessage> {
  try {
    const message = await invoke<Record<string, unknown>>('route_outgoing_message', {
      platform,
      conversation_id: conversationId,
      content,
    });

    return {
      id: String(message.id),
      conversationId: String(message.conversation_id),
      platform: platform as 'telegram' | 'whatsapp',
      sender: {
        id: String(message.sender_id),
        name: String(message.sender_name),
      },
      content: String(message.content),
      timestamp: new Date(String(message.timestamp)),
      status: (message.status as PlatformMessage['status']) || 'sending',
    };
  } catch (error) {
    throw new Error(`Failed to route message: ${error}`);
  }
}

export async function routeIncomingMessage(
  platform: 'telegram' | 'whatsapp',
  messageData: string
): Promise<PlatformMessage> {
  try {
    const message = await invoke<Record<string, unknown>>('route_incoming_message', {
      platform,
      message_data: messageData,
    });

    return {
      id: String(message.id),
      conversationId: String(message.conversation_id),
      platform: platform as 'telegram' | 'whatsapp',
      sender: {
        id: String(message.sender_id),
        name: String(message.sender_name),
      },
      content: String(message.content),
      timestamp: new Date(String(message.timestamp)),
      status: (message.status as PlatformMessage['status']) || 'delivered',
    };
  } catch (error) {
    throw new Error(`Failed to route incoming message: ${error}`);
  }
}

// Platform Status Check
export async function checkPlatformStatus(): Promise<PlatformSetup[]> {
  const platforms: PlatformSetup[] = [];

  // Check Telegram
  try {
    await invoke<string>('telegram_authenticate');
    platforms.push({
      name: 'telegram',
      configured: !!import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
      ready: true,
      status: 'Authenticated',
    });
  } catch {
    platforms.push({
      name: 'telegram',
      configured: !!import.meta.env.VITE_TELEGRAM_BOT_TOKEN,
      ready: false,
      status: 'Not authenticated',
    });
  }

  // Check WhatsApp
  try {
    const isAuth = await checkWhatsAppAuthentication();
    platforms.push({
      name: 'whatsapp',
      configured: true,
      ready: isAuth,
      status: isAuth ? 'Authenticated' : 'Not authenticated',
    });
  } catch {
    platforms.push({
      name: 'whatsapp',
      configured: true,
      ready: false,
      status: 'Error checking status',
    });
  }

  return platforms;
}

// Polling for new messages
export async function startPlatformPolling(
  platforms: ('telegram' | 'whatsapp')[],
  callback: (message: PlatformMessage) => void,
  intervalMs: number = 5000
): Promise<() => void> {
  const intervalId = setInterval(async () => {
    if (platforms.includes('telegram')) {
      try {
        const messages = await getTelegramUpdates();
        messages.forEach(callback);
      } catch (error) {
        console.error('Error polling Telegram:', error);
      }
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
