// Ollama Prompt Templates and System Messages
// Configure prompts for different use cases

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PromptTemplate {
  pub name: String,
  pub description: String,
  pub system_prompt: String,
  pub context_template: String,
}

pub struct OllamaPrompts;

impl OllamaPrompts {
  /// Chat support assistant - helps users with questions across all conversations
  pub fn chat_support() -> PromptTemplate {
    PromptTemplate {
      name: "chat_support".to_string(),
      description: "General chat support and Q&A assistant".to_string(),
      system_prompt: r#"You are a helpful chat assistant integrated into ChatAI, a unified messaging platform that combines WhatsApp, Telegram, and local AI support. 

Your role is to:
1. Answer questions about using ChatAI
2. Help users understand their conversations
3. Provide suggestions for managing multiple chats
4. Clarify ambiguous messages
5. Generate helpful responses when users ask

Be concise, friendly, and professional. Keep responses under 200 words unless more detail is needed.
Acknowledge when you don't have enough context to help.
"#
        .to_string(),
      context_template: "User message from {platform}: {message}".to_string(),
    }
  }

  /// Message suggestion - generates helpful reply suggestions
  pub fn message_suggestion() -> PromptTemplate {
    PromptTemplate {
      name: "message_suggestion".to_string(),
      description: "Generate suggested replies to messages".to_string(),
      system_prompt: r#"You are a message suggestion engine for ChatAI. When given a message from a contact, suggest 2-3 brief, natural reply options.

Guidelines:
- Suggestions should be concise (under 50 characters each)
- Match the tone of the incoming message
- Be helpful but not over-eager
- Suggest realistic responses a user would actually send
- Format: One suggestion per line, without numbering

Keep tone natural and conversational."#
        .to_string(),
      context_template: "Incoming message: {message}\nContext: {context}".to_string(),
    }
  }

  /// Message classifier - categorizes incoming messages
  pub fn message_classifier() -> PromptTemplate {
    PromptTemplate {
      name: "message_classifier".to_string(),
      description: "Classify messages (urgent, question, information, greeting, etc)".to_string(),
      system_prompt: r#"You are a message classifier. Analyze the provided message and classify it into ONE of these categories:

- URGENT: Requires immediate attention or is time-sensitive
- QUESTION: Asking for information or clarification
- INFORMATION: Providing information or updates
- GREETING: Hello, goodbye, or social pleasantries
- PROBLEM: Expressing frustration, complaint, or issue
- SUGGESTION: Offering an idea or recommendation
- SOCIAL: Casual chat or banter
- OTHER: Doesn't fit above categories

Respond with ONLY the category name, nothing else."#
        .to_string(),
      context_template: "{message}".to_string(),
    }
  }

  /// Conversation summarizer - creates summaries of chat threads
  pub fn conversation_summarizer() -> PromptTemplate {
    PromptTemplate {
      name: "conversation_summarizer".to_string(),
      description: "Summarize conversations into key points".to_string(),
      system_prompt: r#"You are a conversation summarizer. Read through the message history and provide a concise summary highlighting:

1. Main topic or purpose of conversation
2. Key decisions or agreements made
3. Any action items or follow-ups needed
4. Overall sentiment (positive, neutral, negative)

Keep summary to 3-5 bullet points. Be objective and factual."#
        .to_string(),
      context_template: "{conversation_history}".to_string(),
    }
  }

  /// Context enrichment - adds helpful information about responses
  pub fn context_enrichment() -> PromptTemplate {
    PromptTemplate {
      name: "context_enrichment".to_string(),
      description: "Provide context and background for complex messages".to_string(),
      system_prompt: r#"You are a context enhancement assistant. When given a message that might be confusing without background:

1. Identify potential confusion points
2. Suggest what context might be missing
3. Ask clarifying questions to better understand the intent
4. Recommend how the user might respond

Keep explanations brief and practical."#
        .to_string(),
      context_template: "Message: {message}\nConversation context: {context}".to_string(),
    }
  }

  /// Get prompt by name
  pub fn get_prompt(name: &str) -> Option<PromptTemplate> {
    match name {
      "chat_support" => Some(Self::chat_support()),
      "message_suggestion" => Some(Self::message_suggestion()),
      "message_classifier" => Some(Self::message_classifier()),
      "conversation_summarizer" => Some(Self::conversation_summarizer()),
      "context_enrichment" => Some(Self::context_enrichment()),
      _ => None,
    }
  }

  /// Get all available prompts
  pub fn all_prompts() -> Vec<PromptTemplate> {
    vec![
      Self::chat_support(),
      Self::message_suggestion(),
      Self::message_classifier(),
      Self::conversation_summarizer(),
      Self::context_enrichment(),
    ]
  }

  /// Format a prompt with context
  pub fn format_prompt(template: &PromptTemplate, context: &str) -> String {
    template.context_template.replace("{context}", context)
  }
}

pub struct ModelRequirements;

impl ModelRequirements {
  pub const MINIMUM_RAM_GB: f64 = 4.0;
  pub const RECOMMENDED_RAM_GB: f64 = 8.0;
  pub const MINIMUM_VRAM_GB: f64 = 2.0;
  pub const RECOMMENDED_VRAM_GB: f64 = 4.0;

  pub fn get_info() -> &'static str {
    r#"
ChatAI Ollama Model Requirements
════════════════════════════════════════════════════════════════════

Recommended Models:
  • Mistral (7B) - Fast, good quality, ~4GB RAM
  • Neural Chat (7B) - Optimized for conversations
  • Llama 2 (7B) - Good general purpose model
  • Zephyr (7B) - Instruction-tuned, follows directions well

Minimum Requirements:
  • System RAM: 4GB (minimum), 8GB (recommended)
  • GPU Memory: 2GB (minimum), 4GB (recommended)
  • Disk Space: 5-15GB depending on model size

Installation:
  1. Download Ollama from ollama.ai
  2. Install and run Ollama
  3. Pull a model: ollama pull mistral
  4. Verify: ollama list

API Endpoint:
  Default: http://localhost:11434
  Configure via VITE_OLLAMA_BASE_URL environment variable

Performance Tips:
  • Start with Mistral 7B for best speed/quality balance
  • Use smaller models (3B) on limited hardware
  • Consider GPU acceleration for faster responses
  • Run Ollama in the background for best performance

Troubleshooting:
  • If app can't connect: Ensure Ollama is running (ollama serve)
  • For slow responses: Check available system RAM
  • For GPU not working: Verify GPU drivers and CUDA/Metal support
"#
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_prompt_retrieval() {
    let prompt = OllamaPrompts::get_prompt("chat_support");
    assert!(prompt.is_some());
    assert_eq!(prompt.unwrap().name, "chat_support");
  }

  #[test]
  fn test_all_prompts() {
    let prompts = OllamaPrompts::all_prompts();
    assert_eq!(prompts.len(), 5);
  }

  #[test]
  fn test_prompt_format() {
    let template = OllamaPrompts::message_suggestion();
    let formatted = OllamaPrompts::format_prompt(&template, "Hello!");
    assert!(formatted.contains("Hello!"));
  }

  #[test]
  fn test_model_requirements() {
    assert!(ModelRequirements::MINIMUM_RAM_GB >= 4.0);
    assert!(ModelRequirements::RECOMMENDED_RAM_GB >= 8.0);
  }
}
