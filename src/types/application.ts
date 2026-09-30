import { Job } from './job.js';

export type ApplicationStatus =
  | 'Discovered'
  | 'Qualified'
  | 'Prepared'
  | 'Ready'
  | 'Submitted'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationTimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  status: 'completed' | 'current' | 'pending';
  description?: string;
}

export interface ScreeningAnswer {
  questionId: string;
  question: string;
  answer: string;
  category: 'work_authorization' | 'salary' | 'experience' | 'notice_period' | 'general';
}

export interface JobApplication {
  id: string;
  jobId: string;
  job: Job;
  status: ApplicationStatus;
  matchScore: number;
  submittedAt?: string;
  lastUpdated: string;
  applicationCode?: string; // e.g., "AXT-2024-0912"
  tailoredResumeName?: string;
  coverLetterAvailable?: boolean;
  screeningAnswers?: ScreeningAnswer[];
  nextStep?: string;
  timeline: ApplicationTimelineEvent[];
  interviewDetails?: {
    date: string;
    time: string;
    type: 'Video Interview' | 'Technical Round' | 'HR Round' | 'On-site';
    meetingLink?: string;
  };
}
