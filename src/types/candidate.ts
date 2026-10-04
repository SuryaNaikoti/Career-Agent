/**
 * Shared Candidate Domain Models & Candidate Truth Layer Types
 * Module 00 Foundation Architecture
 */

/**
 * Candidate Truth Layer: Provenance states for candidate facts.
 * AI_SUGGESTED facts must NEVER automatically become verified candidate facts.
 */
export type FactProvenance =
  | 'CANDIDATE_PROVIDED'
  | 'CANDIDATE_CONFIRMED'
  | 'AI_SUGGESTED'
  | 'EXTERNAL_SOURCE'
  | 'UNKNOWN';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

/**
 * Database schema entity: candidate_profiles
 */
export interface CandidateProfile {
  id: string; // uuid primary key
  userId: string; // foreign key -> auth.users.id
  displayName: string;
  headline?: string | null;
  careerGoal?: string | null;
  targetRoles: string[];
  totalExperienceYears: number;
  preferredLocations: string[];
  workModes: WorkMode[];
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  currency: string;
  workAuthorization?: string | null;
  provenance: FactProvenance;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema entity: candidate_skills
 */
export interface CandidateSkill {
  id: string; // uuid
  profileId: string; // foreign key -> candidate_profiles.id
  userId: string; // foreign key -> auth.users.id
  skillName: string;
  yearsOfExperience?: number | null;
  proficiencyLevel?: 'beginner' | 'intermediate' | 'expert' | null;
  provenance: FactProvenance;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema entity: candidate_experience
 */
export interface CandidateExperience {
  id: string; // uuid
  profileId: string; // foreign key -> candidate_profiles.id
  userId: string; // foreign key -> auth.users.id
  company: string;
  roleTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
  skillsUsed: string[];
  provenance: FactProvenance;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema entity: candidate_education
 */
export interface CandidateEducation {
  id: string; // uuid
  profileId: string; // foreign key -> candidate_profiles.id
  userId: string; // foreign key -> auth.users.id
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  provenance: FactProvenance;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database schema entity: candidate_preferences
 */
export interface CandidatePreferences {
  id: string; // uuid
  profileId: string; // foreign key -> candidate_profiles.id
  userId: string; // foreign key -> auth.users.id
  targetRoles: string[];
  locations: string[];
  workModes: WorkMode[];
  minSalary?: number | null;
  currency: string;
  benefitsPreferred: string[];
  companiesTargeted: string[];
  companiesExcluded: string[];
  provenance: FactProvenance;
  createdAt: string;
  updatedAt: string;
}

/**
 * Development UI Mock Compatibility Types
 * (Preserved strictly for backward-compatible rendering of existing prototype dashboard UI)
 */
export interface DemoCandidateLegacyView {
  id: string;
  name: string;
  avatarUrl?: string;
  title: string;
  email: string;
  phone?: string;
  location: string;
  experienceYears: number;
  skills: string[];
  currentCompany?: string;
  targetRoles: string[];
  preferredLocations: string[];
  expectedSalaryMin: number;
  expectedSalaryDisplay: string;
  workModePreferences: WorkMode[];
  resumeUploaded: boolean;
  resumeFileName?: string;
  resumeLastUpdated?: string;
}

export interface ActivityMetric {
  id: string;
  label: string;
  count: number;
  icon: 'search' | 'star' | 'file-text' | 'message-circle';
  tint: 'blue' | 'purple' | 'green' | 'amber';
}

export interface UpcomingEvent {
  id: string;
  dateMonth: string;
  dateDay: string;
  type: string;
  timeElapsed: string;
  unread: boolean;
  jobTitle: string;
  company: string;
  timeString: string;
  format: 'Video Interview' | 'Technical Round';
}
