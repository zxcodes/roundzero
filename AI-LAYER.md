# RoundZero AI Layer (High-Level Reference)

## Core Principle

Do **not** run a full AI interview for every application.

That wastes:
- compute
- money
- candidate time

Use a funnel:

Application → Pre-Evaluation → Selective Deep Evaluation → Company Review

---

# Overall Flow

1. Candidate applies to a job
2. System runs lightweight pre-evaluation **asynchronously**
3. If candidate looks promising **and job report quota is available**:
   - invite to RoundZero interview
4. If medium fit **and job report quota is available**:
   - ask 2–3 clarifying questions first
5. If low fit:
   - keep under review (no interview)
6. If job report quota is exhausted:
   - remaining pending candidates stay in pipeline
   - candidates receive "position filled" notification
   - no new interviews are created
7. Company receives evaluated candidates with reports

---

# Stage 1: Pre-Evaluation (Cheap + Fast)

## Goal

Decide whether a candidate deserves deeper evaluation.

## Inputs

- Resume
- Candidate profile
- Job description
- Required skills
- Company custom questions

## Output

- Fit score
- Missing requirements
- Confidence
- Next step

## Example Output

- Score: 78
- Missing: AWS experience
- Confidence: High
- Next Step: Invite to RoundZero

## What It Should Check

- Relevant skills match
- Relevant experience
- Seniority fit
- Basic job alignment

---

# Stage 2: Decision Layer

## Quota Check First

Each job has a `final_report_target` (default: 5, max: 15). The system should deliver that many final reports when enough eligible candidates exist.

Capacity is computed from completed reports and active interviews:
- `remainingReports = final_report_target - completedReports`
- `availableInviteSlots = remainingReports - activeInterviews(status IN pending|in_progress)`

## High Match

→ Invite to full AI interview (if quota available)

## Medium Match

→ Ask 2–3 clarifying questions first (if quota available)

## Low Match

→ Hold in `pre_screening` (no interview)

## Target Reached

→ Stop creating interviews. Remaining pending candidates stay in pipeline and receive a "position filled" notification. They are NOT auto-rejected.

## Interview Expiry + Cancel

- Interview invites expire after 48 hours
- Candidates can cancel interviews if they no longer want to participate
- Expired or cancelled interview slots are recycled to the next best eligible candidate

---

# Agent Identity

The AI interviewer is named **Zero**.

Candidate-facing copy references Zero by name:
- "Zero invited you to complete an interview for this role."
- "Your interview with Zero is in progress."
- "Zero has completed the evaluation."

This is a product branding decision, not a model name. The underlying agent class can change; Zero is the user-facing identity.

---

# Stage 3: Deep Evaluation

Only for selected candidates.

## Goal

Measure actual hiring signal beyond resume.

## What Happens

- Resume clarification
- Role-specific questions
- Problem solving
- Tradeoff / judgment questions
- Dynamic follow-ups

## Output

Structured candidate report

---

# Report Limits

Companies set `final_report_target` during job creation (default: 5, max: 15). This controls how many final candidate reports RoundZero will deliver for that role.

Why a limit:
- Prevents noise for companies with only 1 opening
- Keeps evaluation costs predictable
- Forces selectivity in the funnel

When the target is reached, the pipeline closes for new evaluations but the job may remain open. Companies still see unevaluated applicants in a pending list and can manually review or reject them.

---

# Candidate Experience

## After Apply

### Strong Fit
"Zero invited you to complete an interview for this role."

### Medium Fit
"Zero has a few additional questions to help evaluate your fit."

### Low Fit
"Application received and under review."

### Position Filled (Quota Reached)
"This position has received enough evaluations. Your application is still on file and the company may review it directly."

---

# Company Experience

Instead of raw applicants, companies see evaluated candidates.

## Candidate Card

- Name
- Score
- Strengths
- Concerns
- Status

## Full Report

- Overall score
- Summary
- Technical reasoning
- Communication
- Experience relevance
- Strengths
- Risks
- Resume
- Transcript (optional)

---

# Application Status Lifecycle (Decided)

> See **PLATFORM.md § 15.1** for the full decision.

**Decided:** Extend `applications.status` to include all 7 statuses in a single enum.

**Status Funnel:**
- `applied` → `pre_screening` → (`interview_invited` | other outcome) → `interview_in_progress` → `evaluated` → (`shortlisted` | `rejected`)

**Transition Rules:**
- Only companies can move `evaluated` → `shortlisted` or `rejected`
- System auto-advances through `pre_screening` → `interview_invited` → `interview_in_progress` → `evaluated`
- Companies can manually reject at any pre-evaluation stage
- When `final_report_target` is reached, system stops advancing new candidates out of `pre_screening`

---

# Important Notes

## Pre-Evaluation should NOT decide final hiring

It only decides:

"Who deserves deeper evaluation?"

## Avoid keyword-only matching

Use semantic/contextual matching.

## Keep V1 Simple

Build:
- pre-screening
- selective AI interviews
- candidate reports

Skip for now:
- voice/video
- multiple visible agents
- advanced analytics
- over-engineered systems

---

# Long-Term Opportunity

Reusable candidate profile:

If a candidate completed RoundZero recently:
- reuse previous evaluation
- ask only role-specific delta questions

This reduces cost and improves UX.

---

# Product Decisions (Phase 3.5 Exit Criteria)

> All 5 product decisions are documented in **PLATFORM.md § 15**. Refer there for full context.

## Decided Decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | Application Status Lifecycle | ✅ Extend single `applications.status` enum to all 7 statuses |
| 2 | Candidate-Facing Messaging | ✅ Hide pre-evaluation stages; show only 6 candidate-visible statuses |
| 3 | Medium-Fit Follow-Up | ✅ Use synchronous chat UI (same as full interview) with 2–3 questions |
| 4 | Company View Pre/Post AI | ✅ Show full pipeline, pre-eval candidates are read-only |
| 5 | Pre-Evaluation Output Format | ⏳ Pending validation with 5–10 real applications |
| 6 | Final Report Target | ✅ `final_report_target` per job (default: 5, max: 15). Target reached → stop new evaluations, notify candidates, no auto-reject. |

---

# One-Line Summary

RoundZero deeply evaluates the right candidates, not every candidate.
