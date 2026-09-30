import { Job } from '../../src/types/job.js';

export const DEMO_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Senior React Developer',
    company: 'AxisTech',
    companyLetter: 'A',
    companyColor: '#0F172A',
    location: 'Hyderabad · Hybrid',
    workMode: 'Hybrid',
    salary: {
      min: 2200000,
      max: 3000000,
      currency: 'INR',
      period: 'yearly',
      display: '₹22L – ₹30L',
    },
    skills: ['React', 'TypeScript', 'Next.js', 'AWS'],
    experienceRequired: '5+ years',
    matchPercentage: 94,
    postedAt: '2h ago',
    source: 'LinkedIn',
    isBookmarked: false,
    description: 'Looking for a Senior React Developer to architect scalable web apps and high-performance client dashboards.',
    responsibilities: [
      'Lead architecture and design of customer-facing React & TypeScript web applications.',
      'Collaborate with product designers to implement pixel-perfect mobile-first designs.',
      'Optimize Web Vitals and client-side rendering performance.'
    ],
    matchAnalysis: {
      matchPercentage: 94,
      matchingFactors: [
        'Your 5+ years React experience',
        'Required skills match (React, TypeScript)',
        'Location preference (Hyderabad)',
        'Salary range fits your expectation',
        'Similar experience in product companies'
      ],
      potentialGaps: [
        'AWS experience (mentioned in nice to have)',
        'System design experience'
      ],
      salaryAlignment: 'Within Range',
      locationAlignment: 'Perfect'
    }
  },
  {
    id: 'job-2',
    title: 'Frontend Engineer',
    company: 'CloudNova',
    companyLetter: 'C',
    companyColor: '#1E293B',
    location: 'Hyderabad · Remote',
    workMode: 'Remote',
    salary: {
      min: 1800000,
      max: 2600000,
      currency: 'INR',
      period: 'yearly',
      display: '₹18L – ₹26L',
    },
    skills: ['React', 'JavaScript', 'Tailwind CSS', 'GraphQL', 'Next.js'],
    experienceRequired: '4+ years',
    matchPercentage: 89,
    postedAt: '5h ago',
    source: 'Naukri',
    isBookmarked: true,
    description: 'CloudNova is building next-gen cloud observability tools and looking for passionate frontend specialists.',
    responsibilities: [
      'Build real-time metric visualization interfaces.',
      'Implement accessible design system components in Tailwind CSS.'
    ],
    matchAnalysis: {
      matchPercentage: 89,
      matchingFactors: [
        'Strong frontend JavaScript & React foundation',
        'Remote working preference satisfied',
        'Tailwind CSS design system proficiency'
      ],
      potentialGaps: [
        'GraphQL depth (preferred requirement)'
      ],
      salaryAlignment: 'Within Range',
      locationAlignment: 'Perfect'
    }
  },
  {
    id: 'job-3',
    title: 'Senior Frontend Developer',
    company: 'GreenCore',
    companyLetter: 'G',
    companyColor: '#065F46',
    location: 'Bangalore · Hybrid',
    workMode: 'Hybrid',
    salary: {
      min: 2000000,
      max: 2800000,
      currency: 'INR',
      period: 'yearly',
      display: '₹20L – ₹28L',
    },
    skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    experienceRequired: '5+ years',
    matchPercentage: 87,
    postedAt: '1d ago',
    source: 'Instahyre',
    isBookmarked: false,
    description: 'GreenCore builds sustainable fintech infrastructure with modern web tech.',
    responsibilities: [
      'Engineer reliable payment management interfaces.',
      'Integrate GraphQL services with frontend state machines.'
    ],
    matchAnalysis: {
      matchPercentage: 87,
      matchingFactors: [
        'React & TypeScript proficiency',
        'Senior level leadership experience'
      ],
      potentialGaps: [
        'Bangalore relocation needed if hybrid is enforced'
      ],
      salaryAlignment: 'Within Range',
      locationAlignment: 'Acceptable'
    }
  },
  {
    id: 'job-4',
    title: 'Staff UI Engineer',
    company: 'Nimbus Technologies',
    companyLetter: 'N',
    companyColor: '#4338CA',
    location: 'Hyderabad · Hybrid',
    workMode: 'Hybrid',
    salary: {
      min: 2600000,
      max: 3400000,
      currency: 'INR',
      period: 'yearly',
      display: '₹26L – ₹34L',
    },
    skills: ['React', 'TypeScript', 'Architecture', 'Web Vitals'],
    experienceRequired: '6+ years',
    matchPercentage: 96,
    postedAt: 'Just now',
    source: 'Company Careers',
    isBookmarked: false,
    description: 'Looking for a Staff level UI Engineer to spearhead core web application architecture.',
    responsibilities: [
      'Own end-to-end frontend performance and developer platform architecture.',
      'Mentor 10+ frontend engineers across agile pods.'
    ],
    matchAnalysis: {
      matchPercentage: 96,
      matchingFactors: [
        'Exceptional alignment on React architecture',
        'Hyderabad base location',
        'Top tier compensation matching your target'
      ],
      potentialGaps: [],
      salaryAlignment: 'Above Expected',
      locationAlignment: 'Perfect'
    }
  }
];
