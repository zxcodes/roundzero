# Job Templates Feature Design

**Date:** 2025-05-11  
**Feature:** Pre-built job templates for companies to quickly create jobs from popular role types  
**Status:** Design approved

---

## Overview

RoundZero will provide 10 pre-built job templates for the most common modern roles. Companies can click "Start from template" when creating a job, browse templates in a modal dialog, select one, and receive a pre-filled job form that they can customize before publishing.

### Core Value

Reduces time-to-post for common roles. Companies no longer start blank; they select a curated template and make a few edits.

---

## Template List (10 roles)

1. Backend Engineer
2. Frontend Engineer
3. Full Stack Engineer
4. Design Engineer
5. Product Manager
6. DevOps / Infrastructure
7. Data Engineer
8. Marketing Specialist
9. Social Media Specialist
10. Community Manager

---

## Architecture

### Config-Based Storage

Templates are maintained as app-level config, **not in the database**. Single source of truth: `app/shared/job-templates.ts`.

Each template contains:
- `id` — unique slug (e.g., `backend_engineer`)
- `title` — display name (e.g., "Backend Engineer")
- `description` — one-line summary shown on card
- `icon` — icon name from `@hugeicons/react` matching the role
- `tags` — array of category tags (e.g., `["Engineering", "Backend"]`)
- `data` — pre-filled form data matching `JobFormData` shape:
  - `description` — full job description
  - `requirements` — array of required skills/experience
  - `interviewQuestions` — array of 3–5 default interview questions
  - `experienceLevel` — e.g., "mid", "senior"
  - `workplaceType` — "remote", "hybrid", "on_site"
  - `employmentType` — "full_time", "contract"
  - `salaryMin` / `salaryMax` / `salaryCurrency` — suggested range (nullable, optional)
  - `teamSize` / `headcount` — team context (nullable, optional)

### Components

**`<TemplateSelectDialog>`** (`app/features/jobs/components/template-select-dialog.tsx`)
- Modal dialog with header, grid of cards, close button
- Props: `isOpen: boolean`, `onClose: () => void`, `onSelect: (template) => void`
- Renders grid of `<TemplateCard>` components
- Keyboard support: Escape closes, Tab navigates, Enter selects

**`<TemplateCard>`** (`app/features/jobs/components/template-card.tsx`)
- Clickable card component showing template info
- Displays: icon + title + description + tags
- States: default, hover (lift/shadow), focused (ring)
- Click handler triggers parent's `onSelect` callback

**Update `<JobForm>`** (`app/features/jobs/components/job-form.tsx`)
- Accept optional `defaultValues?: Partial<JobFormData>` prop
- If provided, pre-fill form fields from template
- All fields remain editable — no read-only "template mode"
- Existing form behavior unchanged if no `defaultValues` passed

### Job Creation Page Integration

Route: `app/routes/_authenticated/dashboard/jobs/new.tsx`

Changes:
- Add "Start from template" button alongside (or instead of) heading
- State: `[selectedTemplate, setSelectedTemplate]`
- If `selectedTemplate` is set, render `<JobForm defaultValues={selectedTemplate.data} />`
- If `selectedTemplate` is null, show `<TemplateSelectDialog isOpen onSelect={setSelectedTemplate} />`

Flow:
1. User lands on `/jobs/new`
2. `<TemplateSelectDialog>` is open by default
3. User clicks template card → `onSelect` fires → dialog closes, form appears with pre-filled data
4. User edits fields and submits form as usual
5. (Alternative: User can close dialog without selecting → shows empty form for blank creation)

---

## UI Details

### Dialog Layout

```
┌─────────────────────────────────────────┐
│ Start from a template             [✕]   │
├─────────────────────────────────────────┤
│                                         │
│  [Card]  [Card]  [Card]                │
│                                         │
│  [Card]  [Card]  [Card]                │
│                                         │
│  [Card]  [Card]  [Card]                │
│                                         │
│  [Card]  [Card]                        │
│                                         │
└─────────────────────────────────────────┘
```

Responsive grid:
- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

### Card Design

Each template card:
- Icon (48px, centered at top)
- Role title (bold, 16px)
- One-line description (14px, muted text)
- Tags below description (12px, muted backgrounds)
- Padding: `p-4` or `p-6`
- Border: subtle gray
- Hover: shadow lift, cursor pointer
- Focus: ring (keyboard navigation)
- Click: immediate feedback (opacity change)

Use shadcn `<Card>` component as base.

---

## Data Flow

```
Job Creation Page
    ↓
    ├─ [Start from template] button clicked
    ├─ <TemplateSelectDialog> opens
    │   ├─ User browses 10 template cards
    │   └─ User clicks card
    └─ onSelect(template) fires
        ├─ setSelectedTemplate(template)
        ├─ Dialog closes
        └─ <JobForm defaultValues={template.data} /> renders
            └─ User edits fields
                └─ Submit → createJob()
```

---

## Content & Curation

Templates are **curated by hand**, not AI-generated. Each template includes:

- **Realistic, role-specific descriptions** (2–3 paragraphs) covering responsibilities, impact, and context
- **5–10 key requirements** (e.g., "3+ years Node.js", "PostgreSQL experience", etc.)
- **3–5 default interview questions** tailored to validate the role (technical knowledge, problem-solving, domain experience)
- **Suggested salary ranges** (nullable — companies can override or leave blank)
- **Experience level** (junior, mid, senior, lead)
- **Standard workplace/employment type** for the role (remote, hybrid, full-time, etc.)

**No AI generation of template content.** All content is human-written and versioned in code.

---

## User Experience

### Flow Variants

**Variant A: Template → Customize → Publish**
1. Click "Start from template"
2. Select template from dialog
3. Edit pre-filled form (title, description, questions, etc.)
4. Preview job
5. Publish

**Variant B: Skip Template (Blank Form)**
1. Close dialog without selecting
2. Start with blank form (existing behavior)
3. Fill all fields manually
4. Publish

Both flows are supported.

---

## Technical Notes

### No Database Changes
- Templates are static config
- No new DB tables or migrations
- Template selection only affects the form's `defaultValues`

### Form Validation
- Form validation (Zod schema) applies to both template-prefilled and blank forms
- Companies can publish immediately if template data is valid, or edit before publishing

### Localization
- Template content is English only (MVP scope)
- Icon names use hugeicons library

---

## Acceptance Criteria

- [ ] `app/shared/job-templates.ts` created with 10 curated templates
- [ ] `<TemplateSelectDialog>` component renders 3-column grid (responsive)
- [ ] `<TemplateCard>` component displays icon, title, description, tags with hover/focus states
- [ ] Template cards are clickable and trigger `onSelect` callback
- [ ] Job creation page integrates dialog and passes template data to `<JobForm>` as `defaultValues`
- [ ] All form fields can be edited after template selection
- [ ] Template-prefilled form validates and publishes without errors
- [ ] Dialog closes on Escape key
- [ ] Keyboard navigation (Tab) works through template cards
- [ ] Responsive on mobile (1 column), tablet (2 columns), desktop (3 columns)
- [ ] Existing "blank form" creation flow still works if dialog is closed without selecting

---

## Future Enhancements

- Search/filter templates by keyword
- Analytics: track which templates are selected most often
- User-created templates (teams save and reuse custom templates)
- Template versioning and updates
- Localization to other languages
