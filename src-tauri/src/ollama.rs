// Ollama integration module
// Handles communication with local Ollama instance

use serde::{Deserialize, Serialize};
use std::time::Duration;

const OLLAMA_BASE_URL: &str = "http://localhost:11434";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaConfig {
  pub base_url: String,
  pub default_model: String,
  pub timeout_seconds: u64,
}

impl Default for OllamaConfig {
  fn default() -> Self {
    Self {
      base_url: OLLAMA_BASE_URL.to_string(),
      default_model: "mistral".to_string(),
      timeout_seconds: 300,
    }
  }
}

#[derive(Serialize, Debug)]
struct GenerateRequest {
  model: String,
  prompt: String,
  stream: bool,
}

#[derive(Deserialize, Debug)]
pub struct GenerateResponse {
  pub response: String,
  pub model: String,
  #[serde(rename = "created_at")]
  pub created_at: String,
  pub done: bool,
}

#[derive(Deserialize, Debug)]
struct TagsResponse {
  models: Vec<ModelInfo>,
}

#[derive(Deserialize, Debug)]
struct ModelInfo {
  name: String,
}

#[derive(Serialize, Debug)]
struct ChatRequest {
  model: String,
  messages: Vec<ChatMessage>,
  stream: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ChatMessage {
  pub role: String,
  pub content: String,
}

#[derive(Deserialize, Debug)]
pub struct ChatResponse {
  pub message: ChatMessage,
  pub model: String,
  pub done: bool,
}

pub struct OllamaClient {
  config: OllamaConfig,
  client: reqwest::Client,
}

impl Clone for OllamaClient {
  fn clone(&self) -> Self {
    Self {
      config: self.config.clone(),
      client: self.client.clone(),
    }
  }
}

impl OllamaClient {
  pub fn new(config: OllamaConfig) -> Self {
    Self {
      config,
      client: reqwest::Client::new(),
    }
  }

  pub fn default() -> Self {
    Self::new(OllamaConfig::default())
  }

  /// Check if Ollama is available
  pub async fn health_check(&self) -> Result<bool, String> {
    let url = format!("{}/api/tags", self.config.base_url);
    match self
      .client
      .get(&url)
      .timeout(Duration::from_secs(5))
      .send()
      .await
    {
      Ok(response) => Ok(response.status().is_success()),
      Err(_) => Ok(false),
    }
  }

  /// Generate a response from a prompt
  pub async fn generate(&self, prompt: &str, model: &str) -> Result<String, String> {
    let url = format!("{}/api/generate", self.config.base_url);

    let request = GenerateRequest {
      model: model.to_string(),
      prompt: prompt.to_string(),
      stream: false,
    };

    let response = self
      .client
      .post(&url)
      .json(&request)
      .timeout(Duration::from_secs(self.config.timeout_seconds))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let generate_response: GenerateResponse = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(generate_response.response)
  }

  /// List available models
  pub async fn list_models(&self) -> Result<Vec<String>, String> {
    let url = format!("{}/api/tags", self.config.base_url);

    let response = self
      .client
      .get(&url)
      .timeout(Duration::from_secs(10))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let tags_response: TagsResponse = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = tags_response
      .models
      .into_iter()
      .map(|m| m.name)
      .collect();

    Ok(models)
  }

  /// Generate response from chat messages
  pub async fn generate_from_messages(
    &self,
    messages: Vec<ChatMessage>,
    model: &str,
  ) -> Result<String, String> {
    let url = format!("{}/api/chat", self.config.base_url);

    let request = ChatRequest {
      model: model.to_string(),
      messages,
      stream: false,
    };

    let response = self
      .client
      .post(&url)
      .json(&request)
      .timeout(Duration::from_secs(self.config.timeout_seconds))
      .send()
      .await
      .map_err(|e| format!("Request failed: {}", e))?;

    let chat_response: ChatResponse = response
      .json()
      .await
      .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(chat_response.message.content)
  }

  /// Create a system message
  pub fn system_message(content: &str) -> ChatMessage {
    ChatMessage {
      role: "system".to_string(),
      content: content.to_string(),
    }
  }

  /// Create a user message
  pub fn user_message(content: &str) -> ChatMessage {
    ChatMessage {
      role: "user".to_string(),
      content: content.to_string(),
    }
  }

  /// Create an assistant message
  pub fn assistant_message(content: &str) -> ChatMessage {
    ChatMessage {
      role: "assistant".to_string(),
      content: content.to_string(),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_ollama_config_default() {
    let config = OllamaConfig::default();
    assert_eq!(config.base_url, OLLAMA_BASE_URL);
    assert_eq!(config.default_model, "mistral");
    assert_eq!(config.timeout_seconds, 300);
  }

  #[test]
  fn test_message_creation() {
    let system = OllamaClient::system_message("You are a helpful assistant");
    assert_eq!(system.role, "system");

    let user = OllamaClient::user_message("Hello!");
    assert_eq!(user.role, "user");

    let assistant = OllamaClient::assistant_message("Hi there!");
    assert_eq!(assistant.role, "assistant");
  }
}

