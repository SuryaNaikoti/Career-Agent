export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'yearly' | 'monthly';
  display: string; // e.g. "₹22L – ₹30L"
}

export interface JobMatchAnalysis {
  matchPercentage: number;
  matchingFactors: string[];
  potentialGaps: string[];
  salaryAlignment: 'Above Expected' | 'Within Range' | 'Below Expected';
  locationAlignment: 'Perfect' | 'Acceptable' | 'Mismatch';
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companyLetter: string; // e.g., 'A', 'C', 'G'
  companyColor?: string; // background color for avatar
  location: string;
  workMode: WorkMode;
  salary: SalaryRange;
  skills: string[];
  experienceRequired: string; // e.g. "5+ years"
  matchPercentage: number;
  postedAt: string; // e.g. "2h ago"
  source: 'LinkedIn' | 'Naukri' | 'Instahyre' | 'Company Careers' | 'Direct';
  isBookmarked?: boolean;
  description?: string;
  responsibilities?: string[];
  matchAnalysis?: JobMatchAnalysis;
}
