import { invoke } from '@tauri-apps/api/tauri';
import { OllamaResponse } from '@types/index';

export async function queryOllama(prompt: string, model?: string): Promise<OllamaResponse> {
  try {
    const response = await invoke<OllamaResponse>('query_ollama', {
      prompt,
      model: model || import.meta.env.VITE_OLLAMA_MODEL || 'mistral',
    });
    return response;
  } catch (error) {
    console.error('Error querying Ollama:', error);
    throw error;
  }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const models = await invoke<string[]>('get_ollama_models');
    return models;
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    throw error;
  }
}

export async function generateAIResponse(
  messages: Array<{ role: string; content: string }>,
  model?: string
): Promise<string> {
  try {
    const response = await invoke<string>('generate_ai_response', {
      messages,
      model: model || import.meta.env.VITE_OLLAMA_MODEL || 'mistral',
    });
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}
