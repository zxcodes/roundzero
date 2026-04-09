# RoundZero – Product Specification

## 0. Overview

RoundZero is a hiring platform that is being built in two layers:

1. **Core hiring platform**
   - company profiles
   - public jobs board
   - candidate profiles
   - one-click apply
   - applicant review workflow

2. **AI interview and evaluation layer**
   - async structured interviews
   - multi-pass candidate evaluation
   - explainable reports
   - ranked candidate recommendations

The product is not meant to be “just another jobs board.” The end state is a system where companies do less manual screening because candidates arrive already evaluated. But the current build priority is to make the non-AI platform solid first, so the AI layer lands on top of a complete hiring workflow instead of compensating for product gaps.

### Core Value Proposition

> “Post jobs, collect structured candidate profiles, and replace first-round screening with explainable AI interviews.”

---

## 1. Product Position

### 1.1 What RoundZero Is

- A role-specific hiring platform for companies and candidates
- A structured application funnel
- A future AI-driven first-round interview layer
- A candidate evaluation and decision-support system

### 1.2 What RoundZero Is Not

- Not a generic social network for jobs
- Not a resume dump with no downstream workflow
- Not a black-box ranking system with unexplained outputs
- Not a video-interview platform

### 1.3 Current Product State

Today, the app is primarily the **core platform layer**:

- public marketing landing page
- public company directory
- public jobs board
- role-specific login and onboarding
- company job management
- candidate profile/settings
- one-click apply
- applicant lists and status tracking
- in-app workflow notifications

The AI interview, evaluation, report, and ranking systems are still future layers.

---

## 2. Core Principles

### 2.1 Solid Platform Before AI

The AI layer should not be used to paper over missing product fundamentals. The non-AI hiring workflow must be credible on its own first.

### 2.2 Explainability Over Black Box

When the AI layer is added, every recommendation must be evidence-backed and legible to hiring teams.

### 2.3 Structured Inputs Beat Shallow Filtering

The platform should gather cleaner, more useful candidate and job data than a typical job board. Candidate profiles, resumes, work history, skills, and application state should all be structured enough to support later evaluation.

### 2.4 Async by Default

The product should minimize scheduling friction. Applications, profile setup, future interviews, and notifications should all fit asynchronous workflows.

### 2.5 Opinionated, Not Over-Abstracted

RoundZero should choose a clear hiring workflow instead of becoming an infinitely configurable ATS.

---

## 3. Users

### 3.1 Candidates

Candidates use RoundZero to:

- create a profile
- upload a resume
- browse public jobs
- apply with one click
- track application status
- later complete AI interviews

### 3.2 Companies

Companies use RoundZero to:

- create a company profile
- post and manage jobs
- review applicants
- track application pipeline state
- later review AI interview reports and rankings

---

## 4. Current Core Product

### 4.1 Candidate Experience

Current candidate flow:

1. Visit marketing site, jobs board, or company page
2. Sign in via candidate login
3. Complete onboarding:
   - name
   - headline
   - resume upload
4. Maintain profile in settings:
   - bio
   - skills
   - work history
   - links
   - resume
5. Browse jobs
6. Apply with one click
7. Track applications in dashboard

Key rules:

- applying requires a profile resume
- applications snapshot the current profile state needed for review
- candidates should not re-enter redundant links or resume info per application

### 4.2 Company Experience

Current company flow:

1. Sign in via company login
2. Complete onboarding:
   - name
   - short description
   - industry
   - size
3. Maintain full company profile in settings
4. Create jobs
5. Manage open/draft/archived jobs
6. View applicants per job
7. Update application statuses

### 4.3 Public Experience

Public users can:

- view the landing page
- browse companies
- view company pages
- browse jobs
- view job detail pages

This matters because RoundZero is both:

- a workflow application for signed-in users
- a discoverable public hiring surface

---

## 5. Core Product Gaps Before AI

The following are considered platform-hardening work and should be completed before the AI layer becomes the main focus:

### 5.1 Resume Storage Completion

- real Cloudflare R2 upload wiring
- signed upload URLs
- signed read URLs
- reliable resume access for both candidates and authorized companies

### 5.2 Apply Surface Consistency

- authenticated candidates should be able to apply from every valid surface, especially public job detail
- apply states should be consistent:
  - missing resume
  - already applied
  - just applied

### 5.3 Job Lifecycle Completion

- expiry UI
- stale role indicators
- expired-role hiding
- auto-close behavior

### 5.4 Better Applicant Review Workflow

- company-side applicant detail/workbench
- better resume/profile snapshot review
- better status progression UX

### 5.5 Better Candidate Post-Apply Experience

- clearer status meanings
- better application tracking
- stronger feedback about next steps

---

## 6. Future AI Layer

Once the platform layer is solid, RoundZero adds the AI hiring layer.

### 6.1 AI Interview Mode

Recommended mode:

- in-app async chat
- not email
- not live video

Why:

- preserves context
- supports adaptive follow-ups
- works across time zones
- removes scheduling friction

### 6.2 AI Interview Goals

The AI interview should:

- validate resume claims
- probe role-relevant knowledge
- evaluate communication quality
- detect inconsistency or vagueness
- gather evidence for structured evaluation

### 6.3 Evaluation Goals

The evaluation layer should:

- score technical depth
- score communication
- assess experience credibility
- flag contradictions
- generate a report that a company can act on directly

---

## 7. High-Level Product Flow

### 7.1 Current Platform Flow

```
Company creates profile → Company posts job → Candidate creates profile →
Candidate uploads resume → Candidate applies → Company reviews applicant →
Company updates status
```

### 7.2 Future AI-Enabled Flow

```
Company posts job → Candidate applies → AI interview →
Evaluation pipeline → Candidate report → Ranking →
Company reviews top candidates
```

---

## 8. Candidate Data Model (Product-Level)

Candidate profile should contain:

- name
- headline
- resume reference
- bio
- skills
- work history
- external links

Application should contain:

- job
- candidate
- apply-time resume snapshot
- apply-time profile metadata snapshot
- application status

This separation matters:

- the candidate profile is the source of truth
- the application is a snapshot of what was submitted at that time

---

## 9. Company Data Model (Product-Level)

Company profile should contain:

- name
- slug/public URL
- description
- logo
- website
- industry
- size
- founded year
- location
- tech stack
- culture/perks
- social links

Job should contain:

- title
- description
- requirements
- location
- type
- experience level
- salary info
- team size
- headcount
- expiry info
- status

---

## 10. AI Report Structure (Future)

The candidate report is the main AI output artifact.

Expected sections:

- candidate header
- role applied
- summary
- strengths
- weaknesses
- dimension scores
- key insights
- evidence
- final recommendation

The report must be readable by a hiring manager without requiring trust in a hidden scoring system.

---

## 11. Company Workflow Goals

Before AI:

- jobs are easy to post and manage
- applicants are easy to review
- pipeline status is understandable
- resume/profile data is accessible

After AI:

- companies can review structured reports instead of raw first-round resumes
- candidate ranking is explainable
- teams can move faster without losing trust

---

## 12. Candidate Workflow Goals

Before AI:

- profile setup is fast
- resume upload is simple
- applying is low-friction
- application tracking is clear

After AI:

- interviews are async and not exhausting
- candidates understand where they are in the process
- the experience still feels fair and role-relevant

---

## 13. Notifications and Communication

RoundZero will need transactional communication for key workflow events.

Planned uses:

- application submitted confirmations
- interview-ready notifications
- application status updates
- company-facing applicant activity notifications

Recommended provider:

- **Resend** for transactional email

Why:

- simple developer experience
- good fit for app-triggered transactional messages
- enough for MVP without building a complex email system

---

## 14. Success Criteria

### 14.1 Before AI

The core platform is successful when:

- a candidate can create a profile, upload a resume, apply, and track progress without confusion
- a company can create a job, receive applicants, review resumes/profile snapshots, and manage statuses reliably
- the hiring workflow feels coherent without any AI magic

### 14.2 After AI

The AI layer is successful when companies say:

> “I would move these candidates forward without manually screening them first.”

or

> “This saves us real hiring time.”

---

## 15. One-Line Definition

> “A hiring platform that starts with a solid async application workflow and evolves into an explainable AI-driven first-round interview and candidate evaluation system.”
