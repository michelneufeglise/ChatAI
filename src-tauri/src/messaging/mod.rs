// Messaging integrations module
// Sub-modules for WhatsApp and Telegram

pub mod telegram;
pub mod whatsapp;

pub use telegram::TelegramClient;
pub use whatsapp::WhatsAppClient;

/// Normalized message format across platforms
#[derive(Debug, Clone)]
pub enum PlatformMessage {
  Telegram(telegram::TelegramMessage),
  WhatsApp(whatsapp::WhatsAppMessage),
}

impl PlatformMessage {
  pub fn to_normalized(&self) -> crate::db::Message {
    match self {
      Self::Telegram(msg) => TelegramClient::normalize_message(msg),
      Self::WhatsApp(msg) => WhatsAppClient::normalize_message(msg),
    }
  }
}

pub struct MessageRouter;

impl MessageRouter {
  /// Route a message to the appropriate platform handler
  pub fn route_message(
    platform: &str,
    _conversation_id: &str,
    content: &str,
  ) -> Result<String, String> {
    match platform {
      "telegram" => {
        // TODO: Implement Telegram message routing
        Ok(format!("Routing to Telegram: {}", content))
      }
      "whatsapp" => {
        // TODO: Implement WhatsApp message routing
        Ok(format!("Routing to WhatsApp: {}", content))
      }
      _ => Err(format!("Unknown platform: {}", platform)),
    }
  }

  /// Handle incoming message from any platform
  pub fn handle_incoming_message(platform_msg: &PlatformMessage) -> crate::db::Message {
    platform_msg.to_normalized()
  }
}

