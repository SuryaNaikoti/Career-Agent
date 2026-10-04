/**
 * AI Tool System Types & Contracts
 * Module 02 AI Service Foundation
 * 
 * Defines tool definitions, risk levels, permission requirements, and schemas.
 */

import { AiTaskType } from './aiTypes.js';

export type ToolRiskLevel = 'READ' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ToolPermissionRequirement =
  | 'NONE'
  | 'CANDIDATE_READ'
  | 'CANDIDATE_WRITE'
  | 'OAUTH_GMAIL'
  | 'EXPLICIT_CONFIRMATION'
  | 'SUBSCRIPTION_CHANGE';

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description?: string;
    enum?: string[];
    items?: { type: string };
  }>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  allowedTasks: AiTaskType[];
  riskLevel: ToolRiskLevel;
  requiredPermission: ToolPermissionRequirement;
  handler?: (args: Record<string, unknown>, context: { userId: string; requestId: string }) => Promise<unknown>;
}

export interface ToolPermissionCheckInput {
  userId: string;
  action: string;
  tool: ToolDefinition;
  taskType: AiTaskType;
  arguments: Record<string, unknown>;
}

export interface ToolPermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
  requiredPermission: ToolPermissionRequirement;
}
