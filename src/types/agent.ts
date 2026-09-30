import { Job } from './job.js';

export type AgentStepStatus = 'completed' | 'in_progress' | 'pending';

export interface AgentSearchStep {
  id: string;
  label: string;
  elapsedTime: string;
  status: AgentStepStatus;
}

export interface AgentUnderstandingCriteria {
  role: string;
  locations: string[];
  minSalary: string;
  experienceLevel: string;
  sources: { name: string; iconKey: string }[];
}

export interface HumanTask {
  id: string;
  type: 'work_authorization' | 'salary_expectation' | 'notice_period' | 'custom_question';
  title: string;
  companyName: string;
  question: string;
  options: string[];
  selectedOption?: string;
  isCompleted: boolean;
}

export type AgentMessageType =
  | 'welcome'
  | 'user_query'
  | 'understanding'
  | 'searching_progress'
  | 'job_results'
  | 'job_detail'
  | 'application_prep'
  | 'application_preview'
  | 'human_task'
  | 'submission_success'
  | 'followup_status'
  | 'text';

export interface AgentConversationItem {
  id: string;
  sender: 'agent' | 'user';
  timestamp: string;
  type: AgentMessageType;
  text?: string;
  understandingData?: AgentUnderstandingCriteria;
  searchSteps?: AgentSearchStep[];
  jobs?: Job[];
  selectedJob?: Job;
  prepSteps?: AgentSearchStep[];
  humanTask?: HumanTask;
  applicationCode?: string;
  companyName?: string;
}

export interface CareerAgentStatus {
  isActive: boolean;
  statusLabel: 'Active' | 'Paused' | 'Searching';
  currentSearchTitle: string;
  location: string;
  salaryExpectation: string;
  capabilities: {
    jobSearch: boolean;
    matching: boolean;
    resumeTailoring: boolean;
    gmailTracking: boolean;
  };
}
