/**
 * Agent Search Configuration Service
 * Module 13: Autonomous Job Search Engine
 * 
 * Manages candidate limits, auto-apply flags, and safety boundaries.
 */

import { randomUUID } from 'crypto';
import { requireDatabaseClient } from '../supabaseClient.js';
import {
  AgentSearchConfigurationRecord,
  UpdateAgentSearchConfigurationInput,
} from './jobSearchEngineTypes.js';
import { AppError, ValidationError } from '../../core/errors/appError.js';
import { logger } from '../../core/logging/logger.js';

export class AgentConfigurationService {
  /**
   * Retrieves candidate agent search configuration.
   */
  public async getConfiguration(userId: string): Promise<AgentSearchConfigurationRecord> {
    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('agent_search_configurations')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get agent search configuration', { userId, error: error.message });
      throw new AppError(`Failed to get agent configuration: ${error.message}`, 500);
    }

    if (!data) {
      return {
        id: `agent-cfg-${userId}`,
        userId,
        isEnabled: false,
        minMatchScore: 65,
        maxApplicationsPerDay: 5,
        maxApplicationsPerSession: 2,
        allowAutoSubmitOnAllowedSources: false,
        allowedWorkModes: ['Remote', 'Hybrid'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return this.mapDbRowToRecord(data);
  }

  /**
   * Updates configuration settings.
   */
  public async updateConfiguration(
    userId: string,
    input: UpdateAgentSearchConfigurationInput
  ): Promise<AgentSearchConfigurationRecord> {
    if (input.minMatchScore !== undefined && (input.minMatchScore < 0 || input.minMatchScore > 100)) {
      throw new ValidationError('minMatchScore must be between 0 and 100.');
    }
    if (input.maxApplicationsPerDay !== undefined && (input.maxApplicationsPerDay < 1 || input.maxApplicationsPerDay > 50)) {
      throw new ValidationError('maxApplicationsPerDay must be between 1 and 50.');
    }
    if (input.maxApplicationsPerSession !== undefined && (input.maxApplicationsPerSession < 1 || input.maxApplicationsPerSession > 10)) {
      throw new ValidationError('maxApplicationsPerSession must be between 1 and 10.');
    }

    const current = await this.getConfiguration(userId);
    const now = new Date().toISOString();

    const updated: AgentSearchConfigurationRecord = {
      ...current,
      isEnabled: input.isEnabled !== undefined ? input.isEnabled : current.isEnabled,
      minMatchScore: input.minMatchScore !== undefined ? input.minMatchScore : current.minMatchScore,
      maxApplicationsPerDay: input.maxApplicationsPerDay !== undefined ? input.maxApplicationsPerDay : current.maxApplicationsPerDay,
      maxApplicationsPerSession: input.maxApplicationsPerSession !== undefined ? input.maxApplicationsPerSession : current.maxApplicationsPerSession,
      allowAutoSubmitOnAllowedSources: input.allowAutoSubmitOnAllowedSources !== undefined ? input.allowAutoSubmitOnAllowedSources : current.allowAutoSubmitOnAllowedSources,
      allowedWorkModes: input.allowedWorkModes !== undefined ? input.allowedWorkModes : current.allowedWorkModes,
      updatedAt: now,
    };

    const supabase = requireDatabaseClient();
    const { data, error } = await supabase
      .from('agent_search_configurations')
      .upsert(
        {
          user_id: userId,
          is_enabled: updated.isEnabled,
          min_match_score: updated.minMatchScore,
          max_applications_per_day: updated.maxApplicationsPerDay,
          max_applications_per_session: updated.maxApplicationsPerSession,
          allow_auto_submit_on_allowed_sources: updated.allowAutoSubmitOnAllowedSources,
          allowed_work_modes: updated.allowedWorkModes,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      logger.error('Failed to update agent search configuration', { userId, error: error.message });
      throw new AppError(`Failed to update agent configuration: ${error.message}`, 500);
    }

    return this.mapDbRowToRecord(data);
  }

  private mapDbRowToRecord(row: any): AgentSearchConfigurationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      isEnabled: row.is_enabled,
      minMatchScore: parseFloat(row.min_match_score || '65'),
      maxApplicationsPerDay: parseInt(row.max_applications_per_day || '5', 10),
      maxApplicationsPerSession: parseInt(row.max_applications_per_session || '2', 10),
      allowAutoSubmitOnAllowedSources: row.allow_auto_submit_on_allowed_sources,
      allowedWorkModes: row.allowed_work_modes || ['Remote', 'Hybrid'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const agentConfigurationService = new AgentConfigurationService();
