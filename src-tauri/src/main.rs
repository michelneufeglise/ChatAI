#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod db;
mod messaging;
mod message_router;
mod ollama;
mod prompts;

use db::{init_db, Conversation, Message};
use ollama::{ChatMessage, OllamaClient};
use prompts::OllamaPrompts;
use serde_json::json;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

// Global database and Ollama client
struct AppState {
  db_pool: Mutex<Option<db::DbPool>>,
  ollama_client: Mutex<OllamaClient>,
}

#[tauri::command]
async fn greet(name: &str) -> Result<String, String> {
  Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

// ============================================================================
// CONVERSATION COMMANDS
// ============================================================================

#[tauri::command]
async fn get_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::get_all_conversations(&conn).map_err(|e| e.to_string())
  } else {
    Ok(Vec::new())
  }
}

#[tauri::command]
async fn get_conversation(
  id: &str,
  state: State<'_, AppState>,
) -> Result<Option<Conversation>, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::get_conversation(&conn, id).map_err(|e| e.to_string())
  } else {
    Ok(None)
  }
}

#[tauri::command]
async fn create_conversation(
  title: &str,
  platforms: Vec<&str>,
  state: State<'_, AppState>,
) -> Result<Conversation, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;

    let conversation = Conversation {
      id: Uuid::new_v4().to_string(),
      title: title.to_string(),
      platforms: serde_json::to_string(&platforms)
        .map_err(|e| format!("JSON serialization failed: {}", e))?,
      avatar: None,
      unread_count: 0,
      created_at: chrono::Utc::now().to_rfc3339(),
      updated_at: chrono::Utc::now().to_rfc3339(),
    };

    db::insert_conversation(&conn, &conversation).map_err(|e| e.to_string())?;
    Ok(conversation)
  } else {
    Err("Database not initialized".to_string())
  }
}

// ============================================================================
// MESSAGE COMMANDS
// ============================================================================

#[tauri::command]
async fn get_messages(
  conversation_id: &str,
  limit: i32,
  offset: i32,
  state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::get_messages_for_conversation(&conn, conversation_id, limit, offset)
      .map_err(|e| e.to_string())
  } else {
    Ok(Vec::new())
  }
}

#[tauri::command]
async fn send_message(
  conversation_id: &str,
  content: &str,
  platform: &str,
  state: State<'_, AppState>,
) -> Result<Message, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;

    let message = Message {
      id: Uuid::new_v4().to_string(),
      conversation_id: conversation_id.to_string(),
      platform: platform.to_string(),
      sender_id: "user".to_string(),
      sender_name: "You".to_string(),
      sender_avatar: None,
      content: content.to_string(),
      timestamp: chrono::Utc::now().to_rfc3339(),
      status: "sending".to_string(),
      metadata: None,
    };

    db::insert_message(&conn, &message).map_err(|e| e.to_string())?;
    Ok(message)
  } else {
    Err("Database not initialized".to_string())
  }
}

// ============================================================================
// OLLAMA / AI COMMANDS
// ============================================================================

#[tauri::command]
async fn query_ollama(
  prompt: &str,
  model: &str,
  state: State<'_, AppState>,
) -> Result<String, String> {
  let client = {
    let guard = state.ollama_client.lock().unwrap();
    guard.clone()
  };
  client.generate(prompt, model).await
}

#[tauri::command]
async fn get_ollama_models(state: State<'_, AppState>) -> Result<Vec<String>, String> {
  let client = {
    let guard = state.ollama_client.lock().unwrap();
    guard.clone()
  };
  client.list_models().await
}

#[tauri::command]
async fn generate_ai_response(
  messages: Vec<(String, String)>,
  model: &str,
  state: State<'_, AppState>,
) -> Result<String, String> {
  let client = {
    let guard = state.ollama_client.lock().unwrap();
    guard.clone()
  };

  // Convert messages to ChatMessage format
  let chat_messages: Vec<ChatMessage> = messages
    .into_iter()
    .map(|(role, content)| ChatMessage { role, content })
    .collect();

  client.generate_from_messages(chat_messages, model).await
}

#[tauri::command]
async fn check_ollama_health(state: State<'_, AppState>) -> Result<bool, String> {
  let client = {
    let guard = state.ollama_client.lock().unwrap();
    guard.clone()
  };
  client.health_check().await
}

#[tauri::command]
fn get_ollama_prompts() -> Result<Vec<serde_json::Value>, String> {
  let prompts = OllamaPrompts::all_prompts();
  let result: Vec<serde_json::Value> = prompts
    .into_iter()
    .map(|p| {
      json!({
        "name": p.name,
        "description": p.description,
      })
    })
    .collect();
  Ok(result)
}

#[tauri::command]
fn get_ollama_prompt_details(name: &str) -> Result<serde_json::Value, String> {
  OllamaPrompts::get_prompt(name)
    .map(|p| {
      json!({
        "name": p.name,
        "description": p.description,
        "system_prompt": p.system_prompt,
        "context_template": p.context_template,
      })
    })
    .ok_or_else(|| format!("Prompt '{}' not found", name))
}

#[tauri::command]
fn get_model_requirements() -> String {
  prompts::ModelRequirements::get_info().to_string()
}

// ============================================================================
// MESSAGING PLATFORM COMMANDS
// ============================================================================

#[tauri::command]
fn route_message(
  platform: &str,
  conversation_id: &str,
  content: &str,
) -> Result<String, String> {
  messaging::MessageRouter::route_message(platform, conversation_id, content)
}

#[tauri::command]
async fn telegram_authenticate() -> Result<String, String> {
  match messaging::TelegramClient::from_env() {
    Ok(client) => {
      client
        .get_me()
        .await
        .map(|user| format!("Telegram bot authenticated: {}", user.username.unwrap_or_default()))
    }
    Err(e) => Err(e),
  }
}

#[tauri::command]
async fn telegram_get_updates() -> Result<Vec<serde_json::Value>, String> {
  match messaging::TelegramClient::from_env() {
    Ok(client) => {
      let updates = client.get_updates().await?;
      let result: Vec<serde_json::Value> = updates
        .into_iter()
        .filter_map(|update| update.message)
        .map(|msg| {
          json!({
            "message_id": msg.message_id,
            "sender": msg.from.first_name,
            "text": msg.text.unwrap_or_default(),
            "timestamp": msg.date,
          })
        })
        .collect();
      Ok(result)
    }
    Err(e) => Err(e),
  }
}

#[tauri::command]
async fn telegram_send_message(
  chat_id: i64,
  text: &str,
) -> Result<String, String> {
  match messaging::TelegramClient::from_env() {
    Ok(client) => {
      let msg = client.send_message(chat_id, text).await?;
      Ok(format!("Message sent: {}", msg.message_id))
    }
    Err(e) => Err(e),
  }
}

#[tauri::command]
async fn whatsapp_authenticate() -> Result<String, String> {
  match messaging::WhatsAppClient::from_env() {
    Ok(client) => client.authenticate().await,
    Err(e) => Err(e),
  }
}

#[tauri::command]
fn whatsapp_is_authenticated() -> Result<bool, String> {
  Ok(messaging::WhatsAppClient::from_env()
    .map(|client| client.is_authenticated())
    .unwrap_or(false))
}

#[tauri::command]
fn get_whatsapp_setup_guide() -> Result<String, String> {
  Ok(messaging::whatsapp::WhatsAppIntegrationGuide::setup_instructions().to_string())
}

// ============================================================================
// MESSAGE ROUTING COMMANDS
// ============================================================================

#[tauri::command]
async fn route_incoming_message(
  platform: &str,
  message_data: &str,
  state: State<'_, AppState>,
) -> Result<Message, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    message_router::MessageRouter::route_incoming_message(&conn, platform, message_data)
  } else {
    Err("Database not initialized".to_string())
  }
}

#[tauri::command]
async fn route_outgoing_message(
  platform: &str,
  conversation_id: &str,
  content: &str,
  state: State<'_, AppState>,
) -> Result<Message, String> {
  // First send via platform
  let message =
    message_router::MessageRouter::route_outgoing_message(platform, conversation_id, content)
      .await?;

  // Then store in database
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::insert_message(&conn, &message).map_err(|e| e.to_string())?;
  }

  Ok(message)
}

// ============================================================================
// SETTINGS COMMANDS
// ============================================================================

#[tauri::command]
async fn get_setting(key: &str, state: State<'_, AppState>) -> Result<Option<String>, String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::get_setting(&conn, key).map_err(|e| e.to_string())
  } else {
    Ok(None)
  }
}

#[tauri::command]
async fn set_setting(
  key: &str,
  value: &str,
  state: State<'_, AppState>,
) -> Result<(), String> {
  let db_pool = state.db_pool.lock().unwrap();
  if let Some(pool) = db_pool.as_ref() {
    let conn = pool.get().map_err(|e| e.to_string())?;
    db::set_setting(&conn, key, value).map_err(|e| e.to_string())
  } else {
    Err("Database not initialized".to_string())
  }
}

fn main() {
  // Initialize database
  let db_path = tauri::api::path::app_dir(&tauri::Config::default())
    .and_then(|p| p.to_str().map(String::from))
    .unwrap_or_else(|| "chatai.db".to_string());

  let db_pool = init_db(&db_path)
    .map_err(|e| println!("Database initialization error: {}", e))
    .ok();

  let app_state = AppState {
    db_pool: Mutex::new(db_pool),
    ollama_client: Mutex::new(OllamaClient::default()),
  };

  tauri::Builder::default()
    .manage(app_state)
    .invoke_handler(tauri::generate_handler![
      // Greeting
      greet,
      // Conversations
      get_conversations,
      get_conversation,
      create_conversation,
      // Messages
      get_messages,
      send_message,
      // Ollama / AI
      query_ollama,
      get_ollama_models,
      generate_ai_response,
      check_ollama_health,
      get_ollama_prompts,
      get_ollama_prompt_details,
      get_model_requirements,
      // Messaging Platforms
      route_message,
      telegram_authenticate,
      telegram_get_updates,
      telegram_send_message,
      whatsapp_authenticate,
      whatsapp_is_authenticated,
      get_whatsapp_setup_guide,
      // Message Routing
      route_incoming_message,
      route_outgoing_message,
      // Settings
      get_setting,
      set_setting,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

