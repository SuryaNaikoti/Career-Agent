export interface CandidateProfile {
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
  workModePreferences: ('Remote' | 'Hybrid' | 'On-site')[];
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
  dateMonth: string; // e.g. "OCT"
  dateDay: string; // e.g. "7"
  type: string; // e.g. "Interview Invitation"
  timeElapsed: string; // e.g. "2h ago"
  unread: boolean;
  jobTitle: string; // e.g. "Frontend Engineer"
  company: string; // e.g. "Nimbus Technologies"
  timeString: string; // e.g. "Tomorrow, 3:00 PM"
  format: 'Video Interview' | 'Technical Round';
}
