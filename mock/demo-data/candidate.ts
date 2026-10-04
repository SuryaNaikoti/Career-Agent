import { ActivityMetric, UpcomingEvent, DemoCandidateLegacyView } from '../../src/types/candidate.js';

/**
 * DEVELOPMENT ONLY - Mock Candidate Dataset
 * Used exclusively for offline prototype visualization prior to active database hydration.
 */
export const DEMO_CANDIDATE: DemoCandidateLegacyView = {
  id: 'cand-001',
  name: 'Surya',
  title: 'Senior Frontend Developer',
  email: 'Suryanaikoti@gmail.com',
  location: 'Hyderabad, India',
  experienceYears: 5.5,
  skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Redux', 'Web Vitals', 'Node.js'],
  currentCompany: 'Apex Tech Labs',
  targetRoles: ['Senior Frontend Developer', 'Staff UI Engineer', 'Lead React Developer'],
  preferredLocations: ['Hyderabad', 'Remote', 'Bangalore'],
  expectedSalaryMin: 2000000,
  expectedSalaryDisplay: '₹20L+',
  workModePreferences: ['Remote', 'Hybrid'],
  resumeUploaded: true,
  resumeFileName: 'Surya_Naikoti_Senior_Frontend_Resume.pdf',
  resumeLastUpdated: 'Sep 24, 2024'
};

export const DEMO_METRICS: ActivityMetric[] = [
  {
    id: 'm1',
    label: 'Jobs analyzed',
    count: 147,
    icon: 'search',
    tint: 'blue'
  },
  {
    id: 'm2',
    label: 'Strong matches',
    count: 18,
    icon: 'star',
    tint: 'purple'
  },
  {
    id: 'm3',
    label: 'Applications',
    count: 8,
    icon: 'file-text',
    tint: 'green'
  },
  {
    id: 'm4',
    label: 'Responses',
    count: 2,
    icon: 'message-circle',
    tint: 'amber'
  }
];

export const DEMO_UPCOMING_EVENT: UpcomingEvent = {
  id: 'evt-1',
  dateMonth: 'OCT',
  dateDay: '7',
  type: 'Interview Invitation',
  timeElapsed: '2h ago',
  unread: true,
  jobTitle: 'Frontend Engineer',
  company: 'Nimbus Technologies',
  timeString: 'Tomorrow, 3:00 PM',
  format: 'Video Interview'
};
