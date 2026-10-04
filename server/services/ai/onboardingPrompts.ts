/**
 * AI Onboarding Extraction & Interview Prompts
 * Module 03 Interactive AI Onboarding
 */

import { OnboardingStage, ExtractedFact } from '../../../src/types/onboarding.types.js';

export const ONBOARDING_SYSTEM_PROMPT = `
You are the Career Agent Onboarding Interviewer.
Your purpose is to conduct a friendly, professional, structured career intake interview with the candidate.

RULES:
1. ASK ONE CLEAR QUESTION AT A TIME. Keep messages concise (2-3 sentences max).
2. DO NOT make generic speeches or long introductions.
3. EXTRACT structured candidate facts from candidate answers.
4. STRICT TRUTH LAYER: Never invent achievements, employers, or skills. Label candidate statements as CANDIDATE_PROVIDED.
5. If the candidate skipped or didn't provide information, acknowledge it gracefully and move to the next stage.
6. When structured facts are extracted, summarize them clearly and request candidate confirmation.
`.trim();

export interface AiInterviewExtractionResult {
  replyMessage: string;
  extractedFacts: Array<{
    category: 'profile' | 'target_role' | 'experience' | 'skill' | 'education' | 'preference';
    field: string;
    value: unknown;
    displayLabel: string;
    displayValue: string;
  }>;
  suggestedQuickReplies?: string[];
  nextStage?: OnboardingStage;
}

export const OnboardingExtractionJsonSchema = {
  type: 'object',
  properties: {
    replyMessage: { type: 'string', description: 'The conversational response and single next question to the candidate.' },
    extractedFacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['profile', 'target_role', 'experience', 'skill', 'education', 'preference'] },
          field: { type: 'string' },
          value: {},
          displayLabel: { type: 'string' },
          displayValue: { type: 'string' },
        },
        required: ['category', 'field', 'value', 'displayLabel', 'displayValue'],
      },
    },
    suggestedQuickReplies: {
      type: 'array',
      items: { type: 'string' },
    },
    nextStage: {
      type: 'string',
      description: 'Next suggested onboarding stage if current stage objectives are completed.',
    },
  },
  required: ['replyMessage', 'extractedFacts'],
};

export function getStageInitialPrompt(stage: OnboardingStage, candidateName?: string): { message: string; quickReplies?: string[] } {
  switch (stage) {
    case 'INTRO':
      return {
        message: `Welcome${candidateName ? ` ${candidateName}` : ''}! I am your Career Agent. Let's build your verified career profile through a short conversation. What target role or job title are you aiming for next?`,
        quickReplies: ['Frontend Engineer', 'Fullstack Developer', 'Backend Architect', 'Product Manager'],
      };
    case 'BASIC_INFORMATION':
      return {
        message: 'Where are you currently located, and what is your current employment status?',
        quickReplies: ['Employed & Looking', 'Immediately Available', 'Casually Exploring'],
      };
    case 'CAREER_TARGET':
      return {
        message: 'What target roles or job titles would you like me to discover and evaluate for you?',
        quickReplies: ['Senior React Developer', 'Staff Software Engineer', 'Lead Frontend Engineer'],
      };
    case 'EXPERIENCE':
      return {
        message: 'Tell me about your most recent company, your job title there, and roughly how long you worked there.',
        quickReplies: ['Tech Startup (3 yrs)', 'Enterprise IT (5 yrs)', 'Freelance / Consulting'],
      };
    case 'SKILLS':
      return {
        message: 'Which top 3 to 5 core technical or professional skills are your strongest superpowers?',
        quickReplies: ['React & TypeScript', 'Node.js & PostgreSQL', 'System Architecture', 'Cloud & DevOps'],
      };
    case 'EDUCATION':
      return {
        message: 'Where did you complete your degree or formal education, and what was your field of study?',
        quickReplies: ['B.Tech Computer Science', 'B.S. Information Technology', 'Self-Taught / Bootcamp', 'Skip Education'],
      };
    case 'WORK_PREFERENCES':
      return {
        message: 'What work arrangement do you prefer: Remote, Hybrid, or On-site? And are there specific cities you want to target?',
        quickReplies: ['Remote Only', 'Hybrid Preferred', 'Open to Relocation'],
      };
    case 'COMPENSATION':
      return {
        message: 'What is your minimum acceptable compensation or expected salary range?',
        quickReplies: ['₹20L - ₹30L / yr', '$120,000 - $150,000', 'Negotiable based on role', 'Skip for now'],
      };
    case 'CAREER_GOALS':
      return {
        message: 'What is the most important factor in your next move? (e.g. Higher compensation, technical mentorship, work-life balance, high-growth startup)',
        quickReplies: ['Technical Leadership', 'Higher Compensation', 'Remote Flexibility', 'Career Growth'],
      };
    case 'PROFILE_REVIEW':
      return {
        message: 'We have captured your key profile facts! Please review the summary below and confirm all details are accurate.',
        quickReplies: ['Everything looks good', 'I need to edit something'],
      };
    case 'CONFIRMATION':
      return {
        message: 'Your career profile is ready to be locked into your Career Agent Truth Layer. Ready to complete setup?',
        quickReplies: ['Confirm & Complete', 'Review again'],
      };
    case 'COMPLETED':
      return {
        message: 'Your Career Profile is complete and confirmed! Your AI Career Agent is now ready to assist your career.',
        quickReplies: ['Go to Dashboard'],
      };
    default:
      return {
        message: 'How can I assist with your career profile today?',
      };
  }
}
