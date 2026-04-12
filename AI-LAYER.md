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
2. System runs lightweight pre-evaluation
3. If candidate looks promising:
   - invite to RoundZero interview
4. If medium fit:
   - ask a few extra questions
5. If low fit:
   - keep under review / reject / talent pool
6. Company receives evaluated candidates with reports

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

## High Match

→ Invite to full AI interview

## Medium Match

→ Ask 2–3 clarifying questions first

## Low Match

→ Hold / reject / talent pool

---

# Stage 3: RoundZero Deep Evaluation

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

# Candidate Experience

## After Apply

### Strong Fit
"You’ve been invited to complete RoundZero for this role."

### Medium Fit
"A few additional questions will help evaluate your fit."

### Low Fit
"Application received and under review."

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

# Suggested Status Flow

- applied
- pre_screening
- invited_roundzero
- in_roundzero
- evaluated
- shortlisted
- rejected

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

# One-Line Summary

RoundZero deeply evaluates the right candidates, not every candidate.