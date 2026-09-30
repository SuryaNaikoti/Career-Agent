# AI Agent Specification & Candidate Truth Layer

## 1. Candidate Truth Layer (Fundamental Principle)
The AI agent must rigorously distinguish between **VERIFIED CANDIDATE FACTS** and **AI-GENERATED PHRASING**.

### Allowed AI Operations
- Rephrasing candidate achievements for clarity, impact, and ATS alignment.
- Reordering bullet points to emphasize relevant technical skills.
- Summarizing work history into concise cover letter paragraphs.
- Highlighting existing technical competencies that match target job requirements.

### Strictly Prohibited AI Operations (Anti-Hallucination Law)
The AI MUST NEVER invent or hallucinate:
- Past employers or company names
- Degrees, academic institutions, or graduation dates
- Certifications or licenses not held by the candidate
- Total years of experience or dates of employment
- Numerical achievements or metrics not provided by the candidate
- Skills or frameworks the candidate has never used.

### The Missing Information Protocol
When an application asks for a skill, certification, or fact that cannot be verified in the candidate's profile, the agent MUST NOT invent an answer. It must trigger a **Human Task** card (e.g., Work Authorization, Notice Period, Custom Screening Question) requiring explicit candidate input.

---

## 2. Permission Engine Architecture
The AI agent operates under three explicit tiers of authority:

### Tier 1: AUTO (Autonomous Safe Operations)
Actions the agent can perform continuously in the background without interrupting the candidate:
- Searching job sources and APIs
- Filtering opportunities by candidate criteria
- Computing match percentages and identifying gaps
- Generating tailored resume and cover letter drafts for review
- Updating application tracking records from public statuses

### Tier 2: CONFIRM (Human-in-the-Loop Required)
Actions that have legal, personal, or carrier consequences. Require explicit candidate confirmation:
- Submitting an application to a company portal
- Reading recruiter communications from Gmail
- Sending emails or interview confirmations
- Answering sensitive screening questions (work eligibility, criminal history, salary)
- Committing modifications to the primary candidate profile

### Tier 3: DENY (Strictly Prohibited & Blocked)
Actions that the agent engine refuses to execute under any circumstances:
- Fabricating credentials or employment facts
- Attempting to bypass CAPTCHAs or Cloudflare challenges
- Attempting to bypass anti-bot protections or terms of service
- Mass indiscriminate auto-applying
- Unauthorized scraping of restricted private platforms

---

## 3. Tool Registry Architecture (Planned for Module 10)
- `search_jobs(criteria: JobSearchCriteria)`
- `get_job(jobId: string)`
- `score_job(jobId: string, profileId: string)`
- `generate_resume(jobId: string, baseResumeId: string)`
- `generate_cover_letter(jobId: string, company: string)`
- `prepare_application(jobId: string)`
- `submit_application(applicationId: string, candidateConfirmed: boolean)`
- `track_application(applicationId: string)`
- `read_gmail(filter: string)`
- `classify_email(emailId: string)`
- `create_action(task: HumanTask)`
- `generate_daily_report(candidateId: string)`
