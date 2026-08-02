// Message Routing Module
// Handles routing, normalization, and processing of messages across platforms

use crate::db::{insert_message, Conversation, Message};
use serde_json::json;
use std::collections::HashMap;

pub enum MessageSource {
  Telegram(crate::messaging::telegram::TelegramMessage),
  WhatsApp(crate::messaging::whatsapp::WhatsAppMessage),
  User(&'static str),
}

pub struct MessageRouter;

impl MessageRouter {
  /// Route an incoming message from a platform
  pub fn route_incoming_message(
    db_conn: &rusqlite::Connection,
    platform: &str,
    message_data: &str,
  ) -> Result<Message, String> {
    match platform {
      "telegram" => {
        let telegram_msg: crate::messaging::telegram::TelegramMessage =
          serde_json::from_str(message_data)
            .map_err(|e| format!("Failed to parse Telegram message: {}", e))?;

        let normalized = crate::messaging::TelegramClient::normalize_message(&telegram_msg);

        // Ensure conversation exists
        Self::ensure_conversation_exists(db_conn, &normalized.conversation_id, "telegram")?;

        // Store message in database
        insert_message(db_conn, &normalized).map_err(|e| e.to_string())?;

        Ok(normalized)
      }
      "whatsapp" => {
        let whatsapp_msg: crate::messaging::whatsapp::WhatsAppMessage =
          serde_json::from_str(message_data)
            .map_err(|e| format!("Failed to parse WhatsApp message: {}", e))?;

        let normalized = crate::messaging::whatsapp::WhatsAppClient::normalize_message(&whatsapp_msg);

        // Ensure conversation exists
        Self::ensure_conversation_exists(db_conn, &normalized.conversation_id, "whatsapp")?;

        // Store message in database
        insert_message(db_conn, &normalized).map_err(|e| e.to_string())?;

        Ok(normalized)
      }
      _ => Err(format!("Unknown platform: {}", platform)),
    }
  }

  /// Ensure a conversation exists for the given ID
  fn ensure_conversation_exists(
    db_conn: &rusqlite::Connection,
    conversation_id: &str,
    platform: &str,
  ) -> Result<(), String> {
    use crate::db::get_conversation;

    // Check if conversation already exists
    match get_conversation(db_conn, conversation_id) {
      Ok(Some(_)) => Ok(()),
      Ok(None) => {
        // Create new conversation
        let conversation = Conversation {
          id: conversation_id.to_string(),
          title: format!("{} Chat", platform),
          platforms: serde_json::to_string(&vec![platform])
            .map_err(|e| format!("Serialization failed: {}", e))?,
          avatar: None,
          unread_count: 0,
          created_at: chrono::Utc::now().to_rfc3339(),
          updated_at: chrono::Utc::now().to_rfc3339(),
          is_archived: Some(0),
        };
        crate::db::insert_conversation(db_conn, &conversation).map_err(|e| e.to_string())
      }
      Err(e) => Err(e.to_string()),
    }
  }

  /// Merge multiple conversations from different platforms
  pub fn merge_conversations(
    conversations: Vec<Conversation>,
  ) -> HashMap<String, MergedConversation> {
    let mut merged: HashMap<String, MergedConversation> = HashMap::new();

    for conv in conversations {
      // Extract contact ID from conversation ID (e.g., "tg_123" -> "123")
      let contact_key = conv.id.split('_').skip(1).collect::<Vec<_>>().join("_");

      let platforms = serde_json::from_str::<Vec<String>>(&conv.platforms)
        .unwrap_or_else(|_| vec![]);

      merged
        .entry(contact_key)
        .and_modify(|merged_conv| {
          merged_conv.platforms.extend(platforms.clone());
          merged_conv.conversation_ids.push(conv.id.clone());
        })
        .or_insert_with(|| MergedConversation {
          contact_id: conv.id.clone(),
          title: conv.title.clone(),
          platforms,
          conversation_ids: vec![conv.id],
          avatar: conv.avatar,
          unread_count: conv.unread_count,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        });
    }

    merged
  }

  /// Detect and merge duplicate conversations from same contact across platforms
  pub fn deduplicate_conversations(
    db_conn: &rusqlite::Connection,
  ) -> Result<Vec<String>, String> {
    let conversations = crate::db::get_all_conversations(db_conn)
      .map_err(|e| format!("Failed to get conversations: {}", e))?;

    let merged = Self::merge_conversations(conversations);

    // Log merged conversations for now
    let mut merged_ids = Vec::new();
    for (key, merged_conv) in merged {
      if merged_conv.conversation_ids.len() > 1 {
        println!(
          "Merged conversations for {}: {:?}",
          key, merged_conv.conversation_ids
        );
        merged_ids.extend(merged_conv.conversation_ids);
      }
    }

    Ok(merged_ids)
  }

  /// Route a message to be sent (handles platform selection and delivery)
  pub async fn route_outgoing_message(
    platform: &str,
    conversation_id: &str,
    content: &str,
  ) -> Result<Message, String> {
    match platform {
      "telegram" => {
        // Extract chat ID from conversation_id (e.g., "tg_123" -> 123)
        let chat_id: i64 = conversation_id
          .split('_')
          .last()
          .and_then(|id| id.parse().ok())
          .ok_or("Invalid conversation ID for Telegram")?;

        match crate::messaging::TelegramClient::from_env() {
          Ok(client) => {
            let _msg = client.send_message(chat_id, content).await?;
            Ok(Message {
              id: uuid::Uuid::new_v4().to_string(),
              conversation_id: conversation_id.to_string(),
              platform: "telegram".to_string(),
              sender_id: "me".to_string(),
              sender_name: "You".to_string(),
              sender_avatar: None,
              content: content.to_string(),
              timestamp: chrono::Utc::now().to_rfc3339(),
              status: "sent".to_string(),
              metadata: None,
            })
          }
          Err(e) => Err(e),
        }
      }
      "whatsapp" => {
        match crate::messaging::WhatsAppClient::from_env() {
          Ok(client) => {
            let _msg = client.send_message(conversation_id, content).await?;
            Ok(Message {
              id: uuid::Uuid::new_v4().to_string(),
              conversation_id: conversation_id.to_string(),
              platform: "whatsapp".to_string(),
              sender_id: "me".to_string(),
              sender_name: "You".to_string(),
              sender_avatar: None,
              content: content.to_string(),
              timestamp: chrono::Utc::now().to_rfc3339(),
              status: "sent".to_string(),
              metadata: None,
            })
          }
          Err(e) => Err(e),
        }
      }
      _ => Err(format!("Unknown platform: {}", platform)),
    }
  }

  /// Get message delivery status
  pub fn get_message_status(message: &Message) -> serde_json::Value {
    json!({
      "id": message.id,
      "status": message.status,
      "platform": message.platform,
      "timestamp": message.timestamp,
    })
  }

  /// Transform message for display in UI
  pub fn transform_for_ui(message: &Message) -> serde_json::Value {
    json!({
      "id": message.id,
      "conversationId": message.conversation_id,
      "platform": message.platform,
      "sender": {
        "id": message.sender_id,
        "name": message.sender_name,
        "avatar": message.sender_avatar,
      },
      "content": message.content,
      "timestamp": message.timestamp,
      "status": message.status,
    })
  }
}

pub struct MergedConversation {
  pub contact_id: String,
  pub title: String,
  pub platforms: Vec<String>,
  pub conversation_ids: Vec<String>,
  pub avatar: Option<String>,
  pub unread_count: i32,
  pub created_at: String,
  pub updated_at: String,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_merge_conversations() {
    let conversations = vec![
      Conversation {
        id: "tg_123".to_string(),
        title: "John".to_string(),
        platforms: r#"["telegram"]"#.to_string(),
        avatar: None,
        unread_count: 0,
        created_at: "2024-01-01".to_string(),
        updated_at: "2024-01-01".to_string(),
      },
      Conversation {
        id: "wa_john_456".to_string(),
        title: "John".to_string(),
        platforms: r#"["whatsapp"]"#.to_string(),
        avatar: None,
        unread_count: 0,
        created_at: "2024-01-01".to_string(),
        updated_at: "2024-01-01".to_string(),
      },
    ];

    let merged = MessageRouter::merge_conversations(conversations);
    assert!(!merged.is_empty());
  }

  #[test]
  fn test_transform_for_ui() {
    let message = Message {
      id: "msg1".to_string(),
      conversation_id: "conv1".to_string(),
      platform: "telegram".to_string(),
      sender_id: "user123".to_string(),
      sender_name: "John".to_string(),
      sender_avatar: None,
      content: "Hello!".to_string(),
      timestamp: chrono::Utc::now().to_rfc3339(),
      status: "delivered".to_string(),
      metadata: None,
    };

    let ui_message = MessageRouter::transform_for_ui(&message);
    assert!(ui_message.get("conversationId").is_some());
    assert!(ui_message.get("platform").is_some());
  }
}
