// Backboard API Type Definitions

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface Assistant {
  assistant_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  tools?: Tool[];
  top_k?: number;
  embedding_provider?: string;
  embedding_model_name?: string;
  embedding_dims?: number;
  created_at: string;
  updated_at: string;
}

export interface AssistantCreate {
  name: string;
  description?: string;
  system_prompt?: string;
  tools?: Tool[];
  top_k?: number;
  embedding_provider?: string;
  embedding_model_name?: string;
  embedding_dims?: number;
}

export interface AssistantUpdate {
  name?: string;
  description?: string;
  system_prompt?: string;
  tools?: Tool[];
  top_k?: number;
}

export interface Thread {
  thread_id: string;
  assistant_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
  messages?: Message[];
}

export interface ThreadCreate {
  title?: string;
}

export interface Attachment {
  document_id: string;
  filename: string;
  status: DocumentStatus;
}

export interface Memory {
  memory_id: string;
  content: string;
  created_at: string;
}

export interface RetrievedFile {
  document_id: string;
  filename: string;
  chunk_content: string;
  relevance_score: number;
}

export interface Message {
  message_id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  retrieved_memories?: Memory[];
  retrieved_files?: RetrievedFile[];
  created_at: string;
}

export type DocumentStatus = 'pending' | 'processing' | 'indexed' | 'failed';

export interface Document {
  document_id: string;
  filename: string;
  status: DocumentStatus;
  status_message?: string;
  summary?: string;
  created_at: string;
}

export interface DocumentStatusResponse {
  document_id: string;
  status: DocumentStatus;
  status_message?: string;
}

export type MemoryMode = 'Off' | 'Readonly' | 'Auto';

export interface ModelConfig {
  llm_provider: string;
  model_name: string;
}

export interface MessageSendRequest {
  content: string;
  stream?: boolean;
  memory?: MemoryMode;
  llm_provider?: string;
  model_name?: string;
  web_search?: boolean;
  send_to_llm?: boolean;
}

export interface MessageResponse {
  message_id: string;
  thread_id: string;
  role: 'assistant';
  content: string;
  attachments?: Attachment[];
  retrieved_memories?: Memory[];
  retrieved_files?: RetrievedFile[];
  created_at: string;
}

export interface MemoryStats {
  total_memories: number;
  memory_limit: number;
}

export interface MemoryResponse {
  memory_id: string;
  assistant_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

// Backboard Model from API
export interface BackboardModel {
  name: string;
  provider: string;
  context_limit: number;
  max_output_tokens?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  supports_json_mode?: boolean;
}

// Model Provider from API
export interface ModelProvider {
  name: string;
  display_name?: string;
}

export const DEFAULT_MODEL: ModelConfig = {
  llm_provider: 'openai',
  model_name: 'gpt-4o',
};
