import {
  ListResourcesRequest as SdkListResourcesRequest,
  ReadResourceRequest as SdkReadResourceRequest,
  ListResourceTemplatesRequest as SdkListResourceTemplatesRequest,
} from '@modelcontextprotocol/sdk/types.js';

// Type definitions for resource handlers (re-exported from SDK)
export type ListResourcesRequest = SdkListResourcesRequest;
export type ReadResourceRequest = SdkReadResourceRequest;
export type ListResourceTemplatesRequest = SdkListResourceTemplatesRequest;

// Resource template definition
export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  mimeType: string;
  description: string;
}

// Resource content definition
export interface ResourceContent {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
}

// Resource definition
export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Query template categories
export type QueryTemplateCategory = 'joins' | 'aggregations' | 'filters' | 'time-series' | 'cohort';

// Logging function type
export type LogFunction = (message: string, data?: unknown, error?: Error) => void;
