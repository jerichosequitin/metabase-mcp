import { z } from 'zod';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Type definitions for prompt handlers
export type ListPromptsRequest = z.infer<typeof ListPromptsRequestSchema>;
export type GetPromptRequest = z.infer<typeof GetPromptRequestSchema>;

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

// Analysis type for dashboard analysis
export type AnalysisType = 'performance' | 'design' | 'data_quality' | 'comprehensive';

// Logging function type
export type LogFunction = (message: string, data?: unknown, error?: Error) => void;
