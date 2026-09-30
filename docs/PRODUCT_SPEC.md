# Career Agent — Product Specification

## 1. Product Vision & Positioning
**Career Agent** is an AI-native personal career agent.
Positioning: *"Your AI Career Agent."*

The product helps candidates discover relevant jobs, understand opportunities, prepare high-caliber tailored applications, track active pipelines, monitor hiring communications via Gmail, and automate job search workflows under explicit candidate control.

### Anti-Slop & Quality Philosophy
- Quality over quantity. Never "apply to 500 jobs automatically".
- Instead: "Find the right opportunities. Let your Career Agent handle the work."
- Distinguish between verified candidate experience and AI phrasing.

## 2. Core User Journey
1. **Intake & Career Facts:** Candidate connects account and provides employment history, verified skills, and work samples.
2. **Preference Vectoring:** Candidate defines role targets, locations (e.g. Hyderabad, Bangalore, Remote), and minimum compensation (e.g. ₹20L+).
3. **Continuous Discovery:** Agent monitors job feeds (LinkedIn, Naukri, Instahyre, direct company portals).
4. **Transparent Match Scoring:** Agent scores matches with explanations of why it fits and identifies potential gaps.
5. **Tailored Application Prep:** Tailors resumes without hallucinating facts; generates personalized cover letters.
6. **Controlled Dispatch:** Submits applications only after candidate approval (or under explicit autonomous guidelines).
7. **Hiring Intelligence:** Connects to Gmail (with OAuth) to track recruiter responses, interview invitations, and status changes.
8. **Interview Prep & Next Steps:** Keeps the candidate informed with actionable next steps.

## 3. Platform & Target Form Factor
- **Mobile-First Progressive Web App (PWA)**
- Target viewport: 390x844 (iPhone 14/15/16 baseline)
- Responsive range: 360px to 430px mobile, center-framed on desktop viewports.
- Standalone app display with touch targets $\ge 44\text{px}$, smooth transitions, and offline awareness.
