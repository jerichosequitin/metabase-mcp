import {
  ListPromptsRequest as SdkListPromptsRequest,
  GetPromptRequest as SdkGetPromptRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Type definitions for prompt handlers (re-exported from SDK)
export type ListPromptsRequest = SdkListPromptsRequest;
export type GetPromptRequest = SdkGetPromptRequest;

// Prompt argument definition
export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

// Prompt definition
export interface Prompt {
  name: string;
  description: string;
  arguments: PromptArgument[];
}

// Prompt message content types
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ResourceContent {
  type: 'resource';
  resource: {
    uri: string;
    text: string;
    mimeType: string;
  };
}

export type PromptContent = TextContent | ResourceContent;

// Prompt message
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptContent;
}

// Prompt response (matching MCP SDK expected format)
export interface PromptResponse {
  description?: string;
  messages: PromptMessage[];
}

// Logging function type
export type LogFunction = (message: string, data?: unknown, error?: Error) => void;
