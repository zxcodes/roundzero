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
- applicant review pages and status tracking
- in-app workflow notifications
- company billing (Polar) and plan-gated entitlements
- multi-tenant company teams (email invitations, `/dashboard/team`)

The AI interview, evaluation, report, and ranking systems are now live.

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
7. Manage open/draft/archived jobs
8. Set per-job evaluation report target (clamped to plan limit)
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
- [x] Resend email delivery for `report_ready` and `interview_expired`
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
- blended into the final communication score (60% voice, 40% text)
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

| Plan | Price | Active jobs | Reports/job | Teammates (+ owner) |
| --- | --- | --- | --- | --- |
| Free | $0 | 1 | 1 | 1 |
| Starter | $39/mo | 5 | 3 | 2 |
| Growth | $99/mo | 15 | 5 | 4 |
| Scale | $249/mo | 35 | 10 | 10 |

### Gated features

- **Active jobs** — only `open` jobs count toward the limit; companies can always create drafts
- **Evaluation reports** — `final_report_target` per job defaults to the plan's reports/job limit and cannot exceed it
- **Team seats** — plan limits count invited teammates beyond the owner; pending invites consume invite slots; accept is gated on member count
- **AI job creation** — paid plans with active/trialing subscription only

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
- recommendation badge (strong yes / yes / lean no / no)
- overall score (0–10)
- dimension scores (communication, problem solving, ownership, role fit)
- strengths
- weaknesses
- insights
- evidence
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

RoundZero will need transactional communication for key workflow events.

Current and planned uses:

- application submitted confirmations
- application status updates
- company-facing applicant activity notifications
- interview-ready notifications later

Recommended provider for email delivery:

- **Resend** for transactional email

Why:

- simple developer experience
- good fit for app-triggered transactional messages
- enough for MVP without building a complex email system

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

## 16. AI Layer Product Decisions

The following decisions are required **before Phase 4 (AI Interview)** begins. These define how the AI layer integrates with the existing platform.

### 16.1 Decision 1: Application Status Lifecycle

**Question:** How do we model application statuses when the AI layer introduces new evaluation stages?

**Current State:**
- `applications.status` uses: `applied`, `interviewing`, `evaluated`, `rejected`
- AI-LAYER.md suggests: `applied`, `pre_screening`, `interview_invited`, `interview_in_progress`, `evaluated`, `shortlisted`, `rejected`

**Decision:** **Extend the existing `applications.status` enum to include all 8 statuses**

**Rationale:**
- Simpler query patterns (single status column)
- Clear audit trail of all state transitions
- No schema duplication or hidden parallel state machines
- Status transitions follow the funnel: `applied` → `pre_screening` → (`interview_invited` | other outcome) → `interview_in_progress` → `evaluated` → (`shortlisted` | `rejected`)

**Transition Rules:**
- Only companies can move `evaluated` → `shortlisted` or `rejected`
- The system auto-advances through `pre_screening` → `interview_invited` → `interview_in_progress` → `evaluated`
- A company can manually reject at any pre-evaluation stage
- When a job's `final_report_target` is reached, the system stops advancing new candidates out of `pre_screening`

**Implementation:**
- Update `enums.ts`: extend `applicationStatusSchema` to include all 8 statuses
- Update `APPLICATION_STATUS_TRANSITIONS` to enforce the funnel order
- Update all client-facing status labels to distinguish internal (pre-evaluation) vs. external (candidate-visible) states

---

### 16.2 Decision 2: Candidate-Facing Messaging After Apply

**Question:** What messaging do candidates see at each evaluation stage?

**Decision: Hide pre-evaluation stages from candidates**

**Candidate-Visible Status Mapping:**
- `applied` / `pre_screening` → "Application Received"
- `interview_invited` → "Interview Ready"
- `interview_in_progress` → "Interview in Progress"
- `evaluated` → "Under Review"
- `shortlisted` → "Shortlisted"
- `rejected` → "Not Moving Forward"

**Candidate Messages:**
- Strong fit: "Zero invited you to complete an interview for this role."
- Medium fit: "Zero has a few additional questions to help evaluate your fit."
- Low fit: "Application received and under review."

**Implementation:**
- Add `getVisibleApplicationStatus()` helper for status mapping
- Add `applicationStatusCandidateLabelMap` in `config.ts` for exact copy
- Update candidate dashboard to use visible status only

---

### 16.3 Decision 3: Medium-Fit Follow-Up Medium

**Question:** Where and how do medium-fit candidates answer clarifying questions?

**Decision: Use synchronous chat UI (same as full interview)**

**Rationale:**
- Preserves interview context and adaptability
- Candidates get dynamic follow-ups based on answers
- Lower barrier to answer 2–3 questions than to do a full interview
- Reuses the same agent and transcript infrastructure

**Implementation:**
- Medium-fit candidates are invited to a "quick evaluation" via the interview chat UI
- Agent system prompt is modified to ask 2–3 clarifying questions instead of full interview script
- Questions adapt based on resume gaps identified in pre-evaluation
- Output is still a structured report, same as full interview
- Same `interviews` table is used; a `metadata` field can flag it as "quick_eval"

---

### 16.4 Decision 4: Company View With and Without AI Reports

**Question:** Can companies see (and act on) applications before AI evaluation completes?

**Decision: Companies see full pipeline, but pre-evaluation candidates are read-only**

**Before AI Evaluation Completes:**
- Raw applicant list with resume, profile snapshot
- Status badge: "Application Received" or "Under Review"
- No scoring or evaluation report yet
- Cannot change status (read-only until evaluation completes)

**After AI Evaluation Completes:**
- Same applicant list, now includes:
  - AI evaluation report (summary, scores, strengths, concerns)
  - Can change status or shortlist/reject

**Quota-Exhausted State:**
- Once `final_report_target` reports are generated, new applicants remain in pre-evaluation
- Companies still see them in the pending list with full profile data
- No new AI reports are generated until the company edits the job target (within plan limit) or upgrades their plan

**Minimum Viable Company View:**
| State | Shows | Actions |
|---|---|---|
| Pre-evaluation | Name, resume, date, status | None |
| Post-evaluation | Above + AI score, summary, recommendations | Shortlist / Reject |
| Quota exhausted | Same as pre-evaluation | Manual review / reject only |

**Implementation:**
- `getApplicationReviewById` returns profile + evaluation report (if it exists)
- UI conditionally renders "evaluation in progress" vs. full report view
- Action buttons only appear post-evaluation

---

### 16.5 Decision 5: Pre-Evaluation Output Format Validation

**Question:** Is the pre-evaluation output (score + missing requirements + confidence + next step) sufficient?

**Current Spec:**
- **Score:** 0–10 (overall fit)
- **Missing Requirements:** List of role requirements not met
- **Confidence:** High/Medium/Low
- **Next Step:** "Invite to RoundZero" | "Ask follow-ups" | "Hold / Reject"

**Validation Plan:**

1. Run 5–10 real applications through manual evaluation using this format
2. Get hiring manager feedback:
   - Would you trust this to decide "invite" vs. "ask follow-ups"?
   - Are missing requirements useful, or want different dimensions?
   - Should confidence be visible to company or internal only?
   - Is 0–10 score clear, or prefer tier (Strong/Medium/Low)?
3. Adjust output based on feedback
4. Document final schema in `AI-LAYER.md`

**Validation Status:**
- Pre-evaluation pipeline is live and producing scores
- Pre-evaluation only decides "invite to full interview" vs. "not yet"
- It does NOT rank candidates or make final hiring decisions
- If confidence is low, default to "ask follow-ups" rather than reject
- Real-world validation with hiring managers remains pending (deferred to post-MVP)

---

### 16.6 Decision 6: Final Report Target

**Question:** How many final reports should RoundZero deliver per job, and what happens when that target is reached?

**Decision:** Each job has a `final_report_target` set at create/edit time. The default equals the company's plan `reports/job` limit; the value is clamped to `1..perJobLimit` (Free: 1, Starter: 3, Growth: 5, Scale: 10). The system delivers that many final reports whenever enough eligible candidates exist.

This target is based on completed reports, not interview invites.

**Rationale:**
- Prevents evaluation noise for roles with only 1–2 openings
- Keeps costs predictable for companies (tied to subscription tier)
- Forces selectivity in the funnel
- Per-plan defaults match what each tier is priced for

**When Target Is Reached:**
- The system stops creating new interviews for that job
- Remaining pending candidates stay in `pre_screening` (NOT auto-rejected)
- Candidates receive a `position_filled` notification: "This position has received enough evaluations. Your application is still on file and the company may review it directly."
- Companies still see unevaluated applicants in a read-only pending list and can manually reject them

**Interview Slot Policy:**
- Every invite has a 48-hour expiry window
- If a candidate does not complete in time, interview status becomes `expired`
- Candidates can cancel interviews voluntarily; status becomes `cancelled`
- Expired/cancelled slots are recycled to the next best eligible candidate
- Capacity is computed as:
  - `remainingReports = final_report_target - completedReports`
  - `availableInviteSlots = remainingReports - activeInterviews(status IN pending|in_progress)`

**Implementation:**
- `final_report_target INTEGER NOT NULL DEFAULT 5` on `jobs` (DB default is legacy; app sets plan-based default on create)
- Job creation/edit form shows plan-valid range via `reportTargetRangeLabel(entitlements)`
- `enforceReportTarget()` enforces plan limits server-side (strict on user input, clamp on publish/downgrade)
- Pre-evaluation + lifecycle manager computes invite capacity from report completion and active interviews
- Background workflow and cron lifecycle manager send `position_filled` when target is reached

---

## 17. One-Line Definition

> “A hiring platform that starts with a solid async application workflow and evolves into an explainable AI-driven first-round interview and candidate evaluation system.”
