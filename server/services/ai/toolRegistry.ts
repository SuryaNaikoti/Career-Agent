/**
 * AI Tool Registry & Permission Engine
 * Module 02 AI Service Foundation
 * 
 * Defines registered tools, metadata, allowed tasks, risk levels, and permission checks.
 * Tools are NOT executed automatically. The application explicitly enforces permission and arguments.
 */

import {
  ToolDefinition,
  ToolPermissionCheckInput,
  ToolPermissionCheckResult,
} from './toolTypes.js';
import { AiTaskType } from './aiTypes.js';
import {
  AiToolNotFoundError,
  AiToolNotAllowedError,
  AiToolArgumentsInvalidError,
  AiPermissionRequiredError,
} from './aiErrors.js';

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor() {
    this.registerCoreToolDeclarations();
  }

  /**
   * Registers declarations for the future application tool contracts.
   * Execution handlers are deferred to later modules.
   */
  private registerCoreToolDeclarations(): void {
    // 1. search_jobs (READ)
    this.register({
      name: 'search_jobs',
      description: 'Search for available career opportunities matching target criteria.',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Job title or skills keywords' },
          location: { type: 'string', description: 'Location preference' },
          remoteOnly: { type: 'boolean', description: 'Filter by remote status' },
        },
        required: ['keywords'],
      },
      allowedTasks: ['JOB_ANALYSIS', 'JOB_MATCHING', 'GENERAL_CAREER_ASSISTANCE'],
      riskLevel: 'READ',
      requiredPermission: 'NONE',
    });

    // 2. get_job (READ)
    this.register({
      name: 'get_job',
      description: 'Retrieve detailed job specification and requirements by ID.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Unique job identifier' },
        },
        required: ['jobId'],
      },
      allowedTasks: ['JOB_ANALYSIS', 'JOB_MATCHING', 'APPLICATION_PREPARATION'],
      riskLevel: 'READ',
      requiredPermission: 'NONE',
    });

    // 3. score_job (READ)
    this.register({
      name: 'score_job',
      description: 'Calculate matching score between candidate profile and a specific job.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Unique job identifier' },
        },
        required: ['jobId'],
      },
      allowedTasks: ['JOB_MATCHING', 'JOB_ANALYSIS'],
      riskLevel: 'READ',
      requiredPermission: 'NONE',
    });

    // 4. generate_resume (LOW)
    this.register({
      name: 'generate_resume',
      description: 'Generate an ATS-tailored resume draft strictly based on confirmed candidate facts.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Target job ID for tailoring' },
          focusAreas: { type: 'array', description: 'Specific confirmed areas to highlight' },
        },
        required: ['jobId'],
      },
      allowedTasks: ['APPLICATION_PREPARATION', 'RESUME_ANALYSIS'],
      riskLevel: 'LOW',
      requiredPermission: 'CANDIDATE_READ',
    });

    // 5. generate_cover_letter (LOW)
    this.register({
      name: 'generate_cover_letter',
      description: 'Draft a tailored cover letter grounded strictly in confirmed candidate facts.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Target job ID' },
          tone: { type: 'string', description: 'Tone of the letter', enum: ['professional', 'enthusiastic', 'direct'] },
        },
        required: ['jobId'],
      },
      allowedTasks: ['APPLICATION_PREPARATION'],
      riskLevel: 'LOW',
      requiredPermission: 'CANDIDATE_READ',
    });

    // 6. prepare_application (MEDIUM)
    this.register({
      name: 'prepare_application',
      description: 'Package candidate profile, resume, and answers for an application.',
      parameters: {
        type: 'object',
        properties: {
          jobId: { type: 'string', description: 'Target job identifier' },
        },
        required: ['jobId'],
      },
      allowedTasks: ['APPLICATION_PREPARATION'],
      riskLevel: 'MEDIUM',
      requiredPermission: 'CANDIDATE_WRITE',
    });

    // 7. submit_application (HIGH)
    this.register({
      name: 'submit_application',
      description: 'Submit an approved application on behalf of the candidate.',
      parameters: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'ID of the prepared application' },
          confirmedByUser: { type: 'boolean', description: 'Explicit user confirmation flag' },
        },
        required: ['applicationId', 'confirmedByUser'],
      },
      allowedTasks: ['APPLICATION_PREPARATION'],
      riskLevel: 'HIGH',
      requiredPermission: 'EXPLICIT_CONFIRMATION',
    });

    // 8. track_application (READ)
    this.register({
      name: 'track_application',
      description: 'Retrieve submission status and updates for an active application.',
      parameters: {
        type: 'object',
        properties: {
          applicationId: { type: 'string', description: 'Application ID' },
        },
        required: ['applicationId'],
      },
      allowedTasks: ['GENERAL_CAREER_ASSISTANCE', 'APPLICATION_PREPARATION'],
      riskLevel: 'READ',
      requiredPermission: 'CANDIDATE_READ',
    });

    // 9. read_gmail (HIGH)
    this.register({
      name: 'read_gmail',
      description: 'Read recruitment updates from connected candidate Gmail.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for recruiter emails' },
          maxResults: { type: 'number', description: 'Max messages to inspect' },
        },
        required: ['query'],
      },
      allowedTasks: ['GENERAL_CAREER_ASSISTANCE'],
      riskLevel: 'HIGH',
      requiredPermission: 'OAUTH_GMAIL',
    });

    // 10. classify_email (MEDIUM)
    this.register({
      name: 'classify_email',
      description: 'Classify incoming recruiter communication into application interview, rejection, or offer.',
      parameters: {
        type: 'object',
        properties: {
          messageId: { type: 'string', description: 'Message identifier' },
        },
        required: ['messageId'],
      },
      allowedTasks: ['GENERAL_CAREER_ASSISTANCE'],
      riskLevel: 'MEDIUM',
      requiredPermission: 'OAUTH_GMAIL',
    });

    // 11. create_action (LOW)
    this.register({
      name: 'create_action',
      description: 'Queue a suggested follow-up action for user confirmation.',
      parameters: {
        type: 'object',
        properties: {
          actionTitle: { type: 'string', description: 'Short title of action' },
          actionType: { type: 'string', description: 'Category of action' },
          dueAt: { type: 'string', description: 'ISO date string' },
        },
        required: ['actionTitle', 'actionType'],
      },
      allowedTasks: ['GENERAL_CAREER_ASSISTANCE', 'CANDIDATE_PROFILE_ANALYSIS'],
      riskLevel: 'LOW',
      requiredPermission: 'CANDIDATE_WRITE',
    });

    // 12. generate_daily_report (READ)
    this.register({
      name: 'generate_daily_report',
      description: 'Compile daily summary of search progress, submissions, and recruiter responses.',
      parameters: {
        type: 'object',
        properties: {
          targetDate: { type: 'string', description: 'ISO date for the report' },
        },
      },
      allowedTasks: ['GENERAL_CAREER_ASSISTANCE'],
      riskLevel: 'READ',
      requiredPermission: 'CANDIDATE_READ',
    });
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getToolsForTask(taskType: AiTaskType): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.allowedTasks.includes(taskType));
  }

  /**
   * Validates arguments against the tool parameter schema.
   */
  public validateToolArguments(tool: ToolDefinition, args: Record<string, unknown>, requestId?: string): void {
    const required = tool.parameters.required || [];
    for (const reqField of required) {
      if (args[reqField] === undefined || args[reqField] === null || args[reqField] === '') {
        throw new AiToolArgumentsInvalidError(
          `Missing required argument "${reqField}" for tool "${tool.name}"`,
          requestId,
          { tool: tool.name, missingField: reqField }
        );
      }
    }

    // Type validation for provided properties
    for (const [key, value] of Object.entries(args)) {
      const propSchema = tool.parameters.properties[key];
      if (!propSchema) {
        continue;
      }

      if (propSchema.type === 'string' && typeof value !== 'string') {
        throw new AiToolArgumentsInvalidError(`Argument "${key}" must be a string`, requestId);
      }
      if (propSchema.type === 'number' && typeof value !== 'number') {
        throw new AiToolArgumentsInvalidError(`Argument "${key}" must be a number`, requestId);
      }
      if (propSchema.type === 'boolean' && typeof value !== 'boolean') {
        throw new AiToolArgumentsInvalidError(`Argument "${key}" must be a boolean`, requestId);
      }
      if (propSchema.type === 'array' && !Array.isArray(value)) {
        throw new AiToolArgumentsInvalidError(`Argument "${key}" must be an array`, requestId);
      }
      if (propSchema.enum && typeof value === 'string' && !propSchema.enum.includes(value)) {
        throw new AiToolArgumentsInvalidError(
          `Argument "${key}" must be one of: ${propSchema.enum.join(', ')}`,
          requestId
        );
      }
    }
  }

  /**
   * Evaluates application permission boundary for a proposed tool call.
   */
  public checkPermission(input: ToolPermissionCheckInput): ToolPermissionCheckResult {
    const { tool, taskType, arguments: args } = input;

    // 1. Task Eligibility Check
    if (!tool.allowedTasks.includes(taskType)) {
      return {
        allowed: false,
        reason: `Tool "${tool.name}" is not permitted for task "${taskType}"`,
        requiresConfirmation: false,
        requiredPermission: tool.requiredPermission,
      };
    }

    // 2. High/Critical Risk and confirmation requirements
    if (tool.riskLevel === 'HIGH' || tool.riskLevel === 'CRITICAL') {
      if (tool.requiredPermission === 'EXPLICIT_CONFIRMATION') {
        const confirmed = Boolean(args.confirmedByUser);
        if (!confirmed) {
          return {
            allowed: false,
            reason: `Action "${tool.name}" requires explicit user confirmation before execution`,
            requiresConfirmation: true,
            requiredPermission: 'EXPLICIT_CONFIRMATION',
          };
        }
      }

      if (tool.requiredPermission === 'OAUTH_GMAIL') {
        return {
          allowed: false,
          reason: `Action "${tool.name}" requires connected Gmail OAuth authorization`,
          requiresConfirmation: true,
          requiredPermission: 'OAUTH_GMAIL',
        };
      }
    }

    return {
      allowed: true,
      requiresConfirmation: false,
      requiredPermission: tool.requiredPermission,
    };
  }

  /**
   * Validates and executes a tool call under application control.
   */
  public async validateAndExecuteTool(
    toolName: string,
    args: Record<string, unknown>,
    context: { userId: string; taskType: AiTaskType; requestId: string }
  ): Promise<unknown> {
    const tool = this.getTool(toolName);
    if (!tool) {
      throw new AiToolNotFoundError(`Tool "${toolName}" is not registered`, context.requestId);
    }

    if (!tool.allowedTasks.includes(context.taskType)) {
      throw new AiToolNotAllowedError(
        `Tool "${toolName}" is not allowed for task "${context.taskType}"`,
        context.requestId
      );
    }

    this.validateToolArguments(tool, args, context.requestId);

    const permCheck = this.checkPermission({
      userId: context.userId,
      action: toolName,
      tool,
      taskType: context.taskType,
      arguments: args,
    });

    if (!permCheck.allowed) {
      throw new AiPermissionRequiredError(
        permCheck.reason || `Permission denied for tool "${toolName}"`,
        context.requestId,
        { tool: toolName, requiredPermission: permCheck.requiredPermission }
      );
    }

    if (!tool.handler) {
      return {
        status: 'TOOL_PROPOSED_ACCEPTED',
        tool: toolName,
        arguments: args,
        message: 'Tool execution contract verified; handler execution deferred to specialized module.',
      };
    }

    return await tool.handler(args, { userId: context.userId, requestId: context.requestId });
  }
}

export const toolRegistry = new ToolRegistry();
