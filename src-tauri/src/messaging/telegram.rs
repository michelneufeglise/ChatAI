// Telegram Bot API Integration
// Handles receiving and sending messages via Telegram Bot API

use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Clone, Debug)]
pub struct TelegramConfig {
  pub bot_token: String,
  pub api_url: String,
  pub update_timeout: u64, // seconds
}

impl TelegramConfig {
  pub fn new(bot_token: String) -> Self {
    Self {
      bot_token,
      api_url: "https://api.telegram.org".to_string(),
      update_timeout: 30,
    }
  }

  pub fn from_env() -> Result<Self, String> {
    let bot_token = std::env::var("TELEGRAM_BOT_TOKEN")
      .map_err(|_| "TELEGRAM_BOT_TOKEN environment variable not set".to_string())?;
    Ok(Self::new(bot_token))
  }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TelegramMessage {
  pub message_id: i64,
  pub from: TelegramUser,
  pub chat: TelegramChat,
  pub text: Option<String>,
  pub date: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TelegramUser {
  pub id: i64,
  pub is_bot: bool,
  pub first_name: String,
  pub last_name: Option<String>,
  pub username: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TelegramChat {
  pub id: i64,
  pub r#type: String, // "private", "group", "supergroup", "channel"
  pub title: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct TelegramUpdate {
  pub update_id: i64,
  pub message: Option<TelegramMessage>,
}

#[derive(Deserialize, Debug)]
pub struct TelegramResponse<T> {
  pub ok: bool,
  pub result: Option<T>,
  pub error_code: Option<i32>,
  pub description: Option<String>,
}

pub struct TelegramClient {
  config: TelegramConfig,
  client: reqwest::Client,
  last_update_id: std::sync::Mutex<i64>,
}

impl TelegramClient {
  pub fn new(config: TelegramConfig) -> Self {
    Self {
      config,
      client: reqwest::Client::new(),
      last_update_id: std::sync::Mutex::new(0),
    }
  }

  pub fn from_env() -> Result<Self, String> {
    let config = TelegramConfig::from_env()?;
    Ok(Self::new(config))
  }

  /// Get the bot's API URL
  fn get_api_url(&self) -> String {
    format!(
      "{}/bot{}/",
      self.config.api_url, self.config.bot_token
    )
  }

  /// Get bot information
  pub async fn get_me(&self) -> Result<TelegramUser, String> {
    let url = format!("{}getMe", self.get_api_url());

    let response = self
      .client
      .get(&url)
      .timeout(Duration::from_secs(10))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let telegram_response: TelegramResponse<TelegramUser> = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    telegram_response
      .result
      .ok_or_else(|| {
        telegram_response
          .description
          .unwrap_or_else(|| "Unknown error".to_string())
      })
  }

  /// Get new updates from Telegram
  pub async fn get_updates(&self) -> Result<Vec<TelegramUpdate>, String> {
    let url = format!("{}getUpdates", self.get_api_url());
    let last_id = *self.last_update_id.lock().unwrap();

    let response = self
      .client
      .get(&url)
      .query(&[
        ("offset", (last_id + 1).to_string()),
        ("timeout", self.config.update_timeout.to_string()),
      ])
      .timeout(Duration::from_secs(self.config.update_timeout + 10))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let telegram_response: TelegramResponse<Vec<TelegramUpdate>> = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(updates) = telegram_response.result {
      if let Some(last_update) = updates.last() {
        *self.last_update_id.lock().unwrap() = last_update.update_id;
      }
      Ok(updates)
    } else {
      Err(
        telegram_response
          .description
          .unwrap_or_else(|| "Unknown error".to_string()),
      )
    }
  }

  /// Send a text message
  pub async fn send_message(
    &self,
    chat_id: i64,
    text: &str,
  ) -> Result<TelegramMessage, String> {
    let url = format!("{}sendMessage", self.get_api_url());

    let response = self
      .client
      .post(&url)
      .form(&[("chat_id", chat_id.to_string()), ("text", text.to_string())])
      .timeout(Duration::from_secs(30))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let telegram_response: TelegramResponse<TelegramMessage> = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    telegram_response
      .result
      .ok_or_else(|| {
        telegram_response
          .description
          .unwrap_or_else(|| "Unknown error".to_string())
      })
  }

  /// Set webhook URL for receiving updates
  pub async fn set_webhook(&self, url: &str) -> Result<bool, String> {
    let api_url = format!("{}setWebhook", self.get_api_url());

    let response = self
      .client
      .post(&api_url)
      .form(&[("url", url)])
      .timeout(Duration::from_secs(30))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let telegram_response: TelegramResponse<bool> = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(telegram_response.ok)
  }

  /// Remove webhook and use polling
  pub async fn delete_webhook(&self) -> Result<bool, String> {
    let api_url = format!("{}deleteWebhook", self.get_api_url());

    let response = self
      .client
      .post(&api_url)
      .timeout(Duration::from_secs(30))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let telegram_response: TelegramResponse<bool> = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(telegram_response.ok)
  }

  /// Convert Telegram message to normalized format
  pub fn normalize_message(
    telegram_msg: &TelegramMessage,
  ) -> crate::db::Message {
    crate::db::Message {
      id: format!("tg_{}", telegram_msg.message_id),
      conversation_id: format!("tg_{}", telegram_msg.chat.id),
      platform: "telegram".to_string(),
      sender_id: format!("tg_{}", telegram_msg.from.id),
      sender_name: format!(
        "{} {}",
        telegram_msg.from.first_name,
        telegram_msg.from.last_name.clone().unwrap_or_default()
      ),
      sender_avatar: None,
      content: telegram_msg.text.clone().unwrap_or_default(),
      timestamp: chrono::DateTime::from_timestamp(telegram_msg.date, 0)
        .map(|dt| dt.to_rfc3339())
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
      status: "delivered".to_string(),
      metadata: Some(
        serde_json::to_string(&serde_json::json!({
          "telegram_message_id": telegram_msg.message_id,
          "telegram_chat_id": telegram_msg.chat.id,
          "telegram_user_id": telegram_msg.from.id,
        }))
        .unwrap_or_default(),
      ),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_telegram_config_creation() {
    let config = TelegramConfig::new("test_token".to_string());
    assert_eq!(config.bot_token, "test_token");
    assert_eq!(config.api_url, "https://api.telegram.org");
  }

  #[test]
  fn test_api_url_generation() {
    let config = TelegramConfig::new("test_token".to_string());
    let client = TelegramClient::new(config);
    assert!(client.get_api_url().contains("test_token"));
  }
}
