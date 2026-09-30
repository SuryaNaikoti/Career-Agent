import { JobApplication } from '../../src/types/application.js';
import { DEMO_JOBS } from './jobs.js';

export const DEMO_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-1',
    jobId: 'job-1',
    job: DEMO_JOBS[0],
    status: 'Submitted',
    matchScore: 94,
    submittedAt: 'Sep 30, 2024 — 10:42 AM',
    lastUpdated: 'Today, 10:42 AM',
    applicationCode: 'AXT-2024-0912',
    tailoredResumeName: 'Surya_Naikoti_AxisTech.pdf',
    coverLetterAvailable: true,
    screeningAnswers: [
      {
        questionId: 'q1',
        question: 'Are you legally authorized to work in India?',
        answer: 'Yes',
        category: 'work_authorization',
      },
      {
        questionId: 'q2',
        question: 'Notice period duration?',
        answer: '30 days',
        category: 'notice_period',
      },
      {
        questionId: 'q3',
        question: 'Current CTC vs Expected CTC?',
        answer: 'Current: ₹18L, Expected: ₹25L+',
        category: 'salary',
      },
      {
        questionId: 'q4',
        question: 'Years of React.js & TypeScript production experience?',
        answer: '5.5 years',
        category: 'experience',
      }
    ],
    nextStep: 'Under review by hiring team (expected within 3–5 business days)',
    timeline: [
      {
        id: 't1',
        title: 'Application Submitted',
        timestamp: 'Sep 30, 10:42 AM',
        status: 'completed',
        description: 'Applied via Career Agent Direct Gateway'
      },
      {
        id: 't2',
        title: 'Under Review',
        timestamp: 'In progress',
        status: 'current',
        description: 'Recruiter screening candidate match factors'
      },
      {
        id: 't3',
        title: 'Recruiter Response',
        timestamp: 'Expected in 3-5 days',
        status: 'pending',
        description: 'Initial phone screen or technical round'
      }
    ]
  },
  {
    id: 'app-2',
    jobId: 'job-4',
    job: DEMO_JOBS[3],
    status: 'Interview',
    matchScore: 96,
    submittedAt: 'Sep 25, 2024',
    lastUpdated: '2h ago',
    applicationCode: 'NMB-2024-8841',
    tailoredResumeName: 'Surya_Naikoti_Nimbus.pdf',
    coverLetterAvailable: true,
    interviewDetails: {
      date: 'Oct 7, 2024',
      time: '3:00 PM IST',
      type: 'Video Interview',
      meetingLink: 'https://meet.google.com/abc-demo'
    },
    nextStep: 'Video Interview with Senior Engineering Manager tomorrow at 3:00 PM',
    timeline: [
      {
        id: 'nt1',
        title: 'Application Submitted',
        timestamp: 'Sep 25, 2:15 PM',
        status: 'completed',
        description: 'Auto-tailored resume dispatched'
      },
      {
        id: 'nt2',
        title: 'Resume Shortlisted',
        timestamp: 'Sep 27, 11:30 AM',
        status: 'completed',
        description: '96% match approved by tech lead'
      },
      {
        id: 'nt3',
        title: 'Technical Video Interview',
        timestamp: 'Tomorrow, 3:00 PM',
        status: 'current',
        description: 'System design and React internals deep dive'
      }
    ]
  },
  {
    id: 'app-3',
    jobId: 'job-2',
    job: DEMO_JOBS[1],
    status: 'Ready',
    matchScore: 89,
    lastUpdated: '1d ago',
    tailoredResumeName: 'Surya_Naikoti_CloudNova.pdf',
    coverLetterAvailable: true,
    nextStep: 'Tailored application ready. Review and tap submit.',
    timeline: [
      {
        id: 'ct1',
        title: 'Opportunity Matched',
        timestamp: '1d ago',
        status: 'completed'
      },
      {
        id: 'ct2',
        title: 'Application Prepared',
        timestamp: 'Today, 9:00 AM',
        status: 'completed'
      },
      {
        id: 'ct3',
        title: 'Ready for Review',
        timestamp: 'Now',
        status: 'current'
      }
    ]
  }
];
