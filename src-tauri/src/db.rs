use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub type DbPool = Pool<SqliteConnectionManager>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
  pub id: String,
  pub title: String,
  pub platforms: String, // JSON array
  pub avatar: Option<String>,
  pub unread_count: i32,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
  pub id: String,
  pub conversation_id: String,
  pub platform: String,
  pub sender_id: String,
  pub sender_name: String,
  pub sender_avatar: Option<String>,
  pub content: String,
  pub timestamp: String,
  pub status: String,
  pub metadata: Option<String>, // JSON
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
  pub id: String,
  pub username: String,
  pub avatar: Option<String>,
  pub created_at: String,
}

pub fn init_db(db_path: &str) -> Result<DbPool, Box<dyn std::error::Error>> {
  let manager = SqliteConnectionManager::file(db_path);
  let pool = Pool::new(manager)?;

  // Run migrations
  {
    let conn = pool.get()?;
    create_tables(&conn)?;
  }

  Ok(pool)
}

fn create_tables(conn: &rusqlite::Connection) -> SqliteResult<()> {
  // Conversations table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      platforms TEXT NOT NULL,
      avatar TEXT,
      unread_count INTEGER DEFAULT 0,
      last_message_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    [],
  )?;

  // Messages table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_avatar TEXT,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent',
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(conversation_id) REFERENCES conversations(id)
    )",
    [],
  )?;

  // Users table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    [],
  )?;

  // Contacts table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )",
    [],
  )?;

  // Settings table
  conn.execute(
    "CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",
    [],
  )?;

  // Create indexes
  conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)", [])?;
  conn.execute("CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id)", [])?;

  Ok(())
}

// Conversation operations
pub fn insert_conversation(
  conn: &rusqlite::Connection,
  conversation: &Conversation,
) -> SqliteResult<()> {
  conn.execute(
    "INSERT INTO conversations (id, title, platforms, avatar, unread_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)",
    params![
      &conversation.id,
      &conversation.title,
      &conversation.platforms,
      &conversation.avatar,
      conversation.unread_count,
      &conversation.created_at,
      &conversation.updated_at,
    ],
  )?;
  Ok(())
}

pub fn get_conversation(
  conn: &rusqlite::Connection,
  id: &str,
) -> SqliteResult<Option<Conversation>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, platforms, avatar, unread_count, created_at, updated_at FROM conversations WHERE id = ?",
  )?;

  let result = stmt.query_row(params![id], |row| {
    Ok(Conversation {
      id: row.get(0)?,
      title: row.get(1)?,
      platforms: row.get(2)?,
      avatar: row.get(3)?,
      unread_count: row.get(4)?,
      created_at: row.get(5)?,
      updated_at: row.get(6)?,
    })
  });

  match result {
    Ok(conversation) => Ok(Some(conversation)),
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
    Err(e) => Err(e),
  }
}

pub fn get_all_conversations(conn: &rusqlite::Connection) -> SqliteResult<Vec<Conversation>> {
  let mut stmt = conn.prepare(
    "SELECT id, title, platforms, avatar, unread_count, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
  )?;

  let conversations = stmt.query_map([], |row| {
    Ok(Conversation {
      id: row.get(0)?,
      title: row.get(1)?,
      platforms: row.get(2)?,
      avatar: row.get(3)?,
      unread_count: row.get(4)?,
      created_at: row.get(5)?,
      updated_at: row.get(6)?,
    })
  })?;

  let mut result = Vec::new();
  for conversation in conversations {
    result.push(conversation?);
  }
  Ok(result)
}

// Message operations
pub fn insert_message(conn: &rusqlite::Connection, message: &Message) -> SqliteResult<()> {
  conn.execute(
    "INSERT INTO messages (id, conversation_id, platform, sender_id, sender_name, sender_avatar, content, timestamp, status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    params![
      &message.id,
      &message.conversation_id,
      &message.platform,
      &message.sender_id,
      &message.sender_name,
      &message.sender_avatar,
      &message.content,
      &message.timestamp,
      &message.status,
      &message.metadata,
    ],
  )?;
  Ok(())
}

pub fn get_messages_for_conversation(
  conn: &rusqlite::Connection,
  conversation_id: &str,
  limit: i32,
  offset: i32,
) -> SqliteResult<Vec<Message>> {
  let mut stmt = conn.prepare(
    "SELECT id, conversation_id, platform, sender_id, sender_name, sender_avatar, content, timestamp, status, metadata
     FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?",
  )?;

  let messages = stmt.query_map(params![conversation_id, limit, offset], |row| {
    Ok(Message {
      id: row.get(0)?,
      conversation_id: row.get(1)?,
      platform: row.get(2)?,
      sender_id: row.get(3)?,
      sender_name: row.get(4)?,
      sender_avatar: row.get(5)?,
      content: row.get(6)?,
      timestamp: row.get(7)?,
      status: row.get(8)?,
      metadata: row.get(9)?,
    })
  })?;

  let mut result = Vec::new();
  for message in messages {
    result.push(message?);
  }
  result.reverse(); // Return in chronological order
  Ok(result)
}

// Settings operations
pub fn set_setting(conn: &rusqlite::Connection, key: &str, value: &str) -> SqliteResult<()> {
  conn.execute(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    params![key, value],
  )?;
  Ok(())
}

pub fn get_setting(conn: &rusqlite::Connection, key: &str) -> SqliteResult<Option<String>> {
  let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?")?;

  let result = stmt.query_row(params![key], |row| row.get(0));

  match result {
    Ok(value) => Ok(Some(value)),
    Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
    Err(e) => Err(e),
  }
}

