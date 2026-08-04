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
   - **voice communication assessment**
   - multi-pass candidate evaluation
   - explainable reports
   - ranked candidate recommendations

The product is not meant to be “just another jobs board.” Companies do less manual screening because candidates arrive with explainable AI evaluation reports. Both the core hiring platform and the AI interview/evaluation layer are **live**.

### Core Value Proposition

> “Post jobs, collect structured candidate profiles, and replace first-round screening with explainable AI interviews.”

---

## 1. Product Position

### 1.1 What RoundZero Is

- A role-specific hiring platform for companies and candidates
- A structured application funnel
- An AI-driven first-round interview and evaluation layer (live)
- A candidate evaluation and decision-support system

### 1.2 What RoundZero Is Not

- Not a generic social network for jobs
- Not a resume dump with no downstream workflow
- Not a black-box ranking system with unexplained outputs
- Not a video-interview platform

### 1.3 Current Product State

Live today:

- public marketing landing page, company directory, jobs board
- role-specific Google OAuth login and onboarding
- company job management (draft/open/closed, screening questions, job expiry)
- candidate profile/settings, resume upload, one-click apply
- applicant review, AI reports, batch release (`/dashboard/job-batches`)
- async AI pre-evaluation on all applicants (every plan)
- batch-orchestrated text interviews + required voice assessment
- explainable evaluation reports with ranking on job applicants page
- in-app notifications + Cloudflare Email Service for key workflow events
- company billing (Polar) and plan-gated entitlements
- multi-tenant company teams (email invitations, `/dashboard/team`)
- account soft-delete with 30-day restore window and scheduled erasure
- candidate withdraw and `evaluation_failed` recovery (company re-invite)

---

## 2. Core Principles

### 2.1 Solid Platform Before AI

The AI layer should not be used to paper over missing product fundamentals. The non-AI hiring workflow must be credible on its own first.

### 2.2 Explainability Over Black Box

When the AI layer is added, every recommendation must be evidence-backed and legible to hiring teams.

### 2.3 Structured Inputs Beat Shallow Filtering

The platform should gather cleaner, more useful candidate and job data than a typical job board. Candidate profiles, resumes, work history, skills, and application state should all be structured enough to support later evaluation.

### 2.4 Async by Default

The product should minimize scheduling friction. Applications, profile setup, interviews, and notifications all fit asynchronous workflows.

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
- complete async AI interviews (text + voice)

### 3.2 Companies

Companies use RoundZero to:

- create a company profile
- post and manage jobs (within plan limits)
- invite teammates and manage org access
- subscribe to paid plans for higher limits and AI job creation
- review applicants
- track application pipeline state
- review AI interview reports and rankings

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
4. Invite teammates from `/dashboard/team` (owner/admin; plan-gated seat count)
5. Manage subscription on `/dashboard/billing` (owner only)
6. Create jobs (drafts always allowed; opening/publishing gated by active-job limit)
7. Manage jobs (`draft` / `open` / `closed`; archived jobs are `closed` with `archived_at` set)
8. Set an increase-only per-job evaluation report target within the current plan limit
9. View applicants per job
10. Review applicants on dedicated applicant detail pages
11. Update application statuses

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

## 5. Core Product Gaps (Resolved)

The platform-hardening priorities listed below were completed before the AI layer went live:

### 5.1 Candidate Post-Apply Polish

- [x] Empty states and guidance on application tracking surfaces
- [x] Clear next-step communication after status changes
- [x] Interview card on application detail with CTA and status

### 5.2 Company Workflow Quality

- [x] Pipeline summary cues (applicant count, evaluated count)
- [x] Real report scores and recommendation badges on applicant list
- [x] Full report timeline on applicant detail

### 5.3 Notifications Delivery Layer

- [x] In-app notifications as canonical record
- [x] Cloudflare Email Service delivery for `interview_invited`, `report_ready`, `batch_ready`, `application_status_changed`, `position_filled`, and related types (see `notificationTypeSchema`)
- [x] Delivery tracking on notification rows

### 5.4 Public Route Cleanup

- [x] Expired-job-specific public error UI
- [x] Dead CTA branches removed from public job detail

---

## 6. AI Layer (Live)

RoundZero now includes the AI hiring layer on top of the solid platform.

### 6.1 AI Interview Mode

- in-app async chat (text-based, no video)
- required ~5 minute voice assessment after the text interview
- preserves context and supports adaptive follow-ups
- works across time zones without scheduling friction

### 6.2 AI Interview Goals

The AI interview:

- validates resume claims
- probes role-relevant knowledge
- evaluates communication quality
- detects inconsistency or vagueness
- gathers evidence for structured evaluation

### 6.3 Voice Assessment

After the text interview, candidates complete a short voice conversation to evaluate real-time communication:

- ~5 minute voice call, browser-based, no setup required
- evaluated across 5 dimensions: clarity, articulation, conciseness, listening, confidence
- blended into the final communication score with evidence-based weighting (≈15–70% voice, not a fixed split — see `applyVoiceAssessmentToReport()`)
- full transcript and dimension scores visible in the company report
- required to complete — post-interview report generation waits for voice

### 6.3 Evaluation Goals

The evaluation layer:

- scores communication, problem solving, ownership, and role fit
- generates an explainable report with strengths, weaknesses, insights, and evidence
- produces a recommendation (strong yes / yes / lean no / no)
- flags contradictions via deterministic fallback when LLM output is invalid

---

## 7. High-Level Product Flow

### 7.1 Current Platform Flow

```
Company creates profile → Company posts job → Candidate creates profile →
Candidate uploads resume → Candidate applies → Company reviews applicant →
Company updates status
```

### 7.2 AI-Enabled Flow

```
Company posts job → Candidate applies → AI interview →
Voice assessment → Evaluation pipeline → Candidate report →
Ranking → Company reviews top candidates
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
- `final_report_target` (per-job evaluation quota; default and max come from subscription plan)

Company membership:

- `company_members` — who belongs to the org and with what role (`owner`, `admin`, `member`)
- `company_invitations` — pending email invites with accept flow at `/invite/$token`

---

## 10. Billing and Plans

RoundZero uses subscription plans with hard caps (no overage billing). Plan config lives in `app/features/billing/config.ts`.

| Plan    | Price   | Active jobs | Reports/job | Teammates (+ owner) |
| ------- | ------- | ----------- | ----------- | ------------------- |
| Free    | $0      | 1           | 5           | 1                   |
| Starter | $39/mo  | 5           | 15          | 2                   |
| Growth  | $99/mo  | 15          | 25          | 4                   |
| Scale   | $249/mo | 35          | 50          | 10                  |

### Gated features

- **Active jobs** — only `open` jobs count toward the limit; companies can always create drafts
- **Evaluation reports** — `final_report_target` defaults to the plan limit; new/increased targets cannot exceed the current limit and existing targets never decrease
- **Team seats** — plan limits count invited teammates beyond the owner; pending invites consume invite slots; accept is gated on member count
- **AI job creation** — paid plans with active/trialing subscription only
- **Job importing** — Growth and Scale plans with active/trialing subscription only
- **AI pre-evaluation** — runs on all applicants on every plan (not gated)

### Checkout

- Polar handles checkout, subscription lifecycle, and customer portal
- Webhook updates `companies.subscription_*` fields
- Entitlements are derived at runtime via `deriveEntitlements()` and enforced server-side on mutations

---

## 11. AI Report Structure (Live)

The candidate report is the main AI output artifact.

Live sections:

- candidate header (name, job, apply date)
- summary
- recommendation badge (UI labels: Strong shortlist / Shortlist / Borderline / Reject; schema: `strong_yes` / `yes` / `lean_no` / `no`)
- overall score (0–10)
- dimension scores (communication, problem solving, ownership, role fit)
- strengths
- weaknesses
- insights
- evidence
- screening answers (per company screening question)
- answer authenticity risk block (signals + risk level)
- pre-screening to interview to post-evaluation timeline
- interview transcript (all standardised messages)
- voice communication assessment (if completed):
  - 5 dimension scores (clarity, articulation, conciseness, listening, confidence)
  - AI summary and evidence highlights
  - full conversation transcript

The report is readable by a hiring manager without requiring trust in a hidden scoring system.

---

## 12. Company Workflow Goals

Before AI:

- jobs are easy to post and manage
- applicants are easy to review
- pipeline status is understandable
- resume/profile data is accessible

After AI (live):

- companies review structured reports instead of raw first-round resumes
- candidate ranking is explainable and scored
- teams can move faster without losing trust
- evaluated candidates are ranked by overall score on the job applicants page

---

## 13. Candidate Workflow Goals

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

## 14. Notifications and Communication

Notifications are **in-app first**; email is a secondary channel via Cloudflare Email Service.

Live notification types (`notificationTypeSchema`):

- `application_status_changed`
- `application_withdrawn`
- `interview_invited`
- `report_ready` (non-batched per-candidate release)
- `batch_ready` (primary digest when a batch releases)
- `position_filled` (quota exhausted)
- `job_published`, `job_archived`, `job_closed`

Each row tracks email delivery status. There is no `interview_expired` notification type — expiry is surfaced in the interview UI and DB status.

---

## 15. Success Criteria

### 15.1 Before AI

The core platform is successful when:

- a candidate can create a profile, upload a resume, apply, and track progress without confusion
- a company can create a job, receive applicants, review resumes/profile snapshots, and manage statuses reliably
- the hiring workflow feels coherent without any AI magic

### 15.2 After AI

The AI layer is successful when companies say:

> “I would move these candidates forward without manually screening them first.”

or

> “This saves us real hiring time.”

---

## 16. AI Layer — Implemented Decisions

These decisions are **shipped**. See **AI-LAYER.md** for implementation detail.

### 16.1 Application status lifecycle

**11 statuses** in `applicationStatusSchema`:

`applied`, `pre_screening`, `queued_for_batch`, `interview_invited`, `interview_in_progress`, `evaluated_held`, `evaluated`, `shortlisted`, `rejected`, `withdrawn`, `evaluation_failed`

**Funnel:** `applied` → `pre_screening` → `queued_for_batch` → `interview_invited` → `interview_in_progress` → `evaluated_held` → `evaluated` → (`shortlisted` | `rejected`)

**Rules:**

- System auto-advances through the funnel
- Companies can **reject** at any pre-terminal stage; **shortlist** only from `evaluated`
- Candidates can **withdraw** from most non-terminal states
- `evaluation_failed` is recoverable — companies can re-invite to interview

### 16.2 Candidate-facing messaging

Pre-eval stages are collapsed in candidate UI. Copy is defined per-route (e.g. `stageCopy` in `application/$applicationId.tsx`), not a shared `getVisibleApplicationStatus()` helper.

Notable states:

- `queued_for_batch` — “Under review”; invite typically within 12 hours
- `interview_invited` / `interview_in_progress` — Zero interview CTAs with expiry countdown

**Not implemented:** separate “medium fit → 2–3 clarifying questions” messaging or interview mode.

### 16.3 Company view

Companies see the full pipeline at all stages. Pre-eval applicants show profile/resume without a report. **Reject** is available before evaluation completes; **shortlist** requires `evaluated` status.

### 16.4 Pre-evaluation output

Live output: score (0–10), missing requirements, confidence, model next step (`interview_invited` | `hold`). Deterministic policy (`shouldInviteFromDeterministicRules`) gates pooling. Pre-eval does not make final hire decisions.

### 16.5 Final report target + batching

- `final_report_target` per job is increase-only and bounded by the current plan for new commitments
- Quota consumption is **delivered + reserved**: released reports plus report-producing interviews; completed interviews remain reserved until release
- Strong fits enter `queued_for_batch` as a capacity-free waitlist; invites are atomically claimed under a job lock
- Reports held at `evaluated_held` until batch release (`batch_ready` digest)
- Reports completed after batch release become visible immediately and send one deduplicated `report_ready` notification
- **12-hour** interview window from batch launch; `awaiting_voice` not auto-expired
- Successful expiry, cancellation, withdrawal, or company rejection checks for immediate backfill after commit
- Scheduled crons: pool-check every 6h, eval-retry every 3h (`wrangler.jsonc`)

---

## 17. Account Deletion

Self-service account deletion is available in candidate and company settings (`DeleteAccountSection`).

### Soft delete + grace period

1. User confirms deletion → `deleteAccount` sets `users.deleted_at`
2. **30-day grace** (`ACCOUNT_ERASURE_GRACE_DAYS`) — user can restore by signing in with Google (`restoreUser` on login)
3. During grace: session ends; deleted users are filtered from public queries (`deleted_at IS NULL`)

### Hard erasure (after grace)

Daily cron (`0 4 * * *`) runs `AccountCleanupWorkflow`, which calls `eraseDeletedAccount` for up to 50 users per sweep:

- Deletes R2 objects (resumes, voice audio)
- Scrubs candidate profile, applications, interview messages, voice transcripts, pre-eval raw responses
- Redacts report text fields; preserves aggregate scores/recommendations for company analytics
- Deletes notifications and feedback
- Sole-owner companies with no other active members: archives open jobs
- Sets `users.anonymized_at` and placeholder email (`deleted+<id>@deleted.invalid`)

Idempotent — safe to re-run.

---

## 18. One-Line Definition

> “A hiring platform with a solid async application workflow and a live explainable AI first-round interview and candidate evaluation system.”
