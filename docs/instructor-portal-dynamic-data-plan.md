# Instructor portal — dynamic data plan

This document tracks making instructor UI match Supabase (`supabase/migrations/`) instead of placeholders. Implementation proceeds in phases; check off items as you complete them.

## Schema reference (quick)

| Concept | Tables / columns |
|--------|-------------------|
| Delivery mode | `classes.type` — enum `class_type`: `on_campus`, `online`, `hybrid` |
| Lessons | `class_lessons`, `class_lesson_elements`, `class_lesson_clos` |
| Course defaults | `instructor_course_settings` |
| Exams | `subject_exams` (+ `assessment_settings` jsonb), `subject_exam_questions` |
| Question bank | `subject_question_bank` |
| Homework | `subject_homework` (`due_date`, `class_id`, `status`) |

---

## Phase 1 — My Courses (`InstructorMyCourses.jsx`) — **done**

- [x] Select `classes.type`; map `online` / `hybrid` / `on_campus` → existing i18n keys (no `index % 3`).
- [x] Remove cosmetic integrity badge (`index === 1`); use real signals (e.g. all lessons still draft vs content complete vs last modified).
- [x] Last activity: `max(class_lessons.updated_at)` per class; show relative/short date via `lastModified` (not fixed “yesterday”).
- [x] Upcoming assessments stat: **exams** in date window + **homework** due in same window (`HW_PUB` / `HW_CLD`); clarify subtitle in locales.
- [x] Office hours: no DB model yet — show **—** in schedule summary instead of hardcoded `0`.
- [ ] _(Optional)_ Rename top stat if product wants “exams only” elsewhere.

---

## Phase 2 — Exam settings (`InstructorExamSettings.jsx`) — **done**

- [x] Require `?classId=` + `?examId=`; load `subject_exams` and merge `assessment_settings` with existing keys (authoring-compatible).
- [x] Controlled fields; **Save** updates `scheduled_date`, `start_time`, `end_time`, `duration_minutes`, and full merged `assessment_settings`.
- [x] Timezone, integrity, summary, resume policy, shuffle flags, and **accommodations** array stored in `assessment_settings` (no demo row).
- [x] Shared date helpers: `src/utils/subjectExamDateTime.js`.

**Optional later:** extract a shared `buildExamUpdatePayload` module used by both this page and `InstructorAssessmentAuthoring.jsx` to guarantee zero drift.

---

## Phase 3 — Rubrics & authoring defaults — **done (DB + migration)**

- [x] Migration `supabase/migrations/20260405120000_rubrics.sql`: table `rubrics` (`code`, `matrix` jsonb, RLS: active readable by authenticated; write admin-only).
- [x] Seed rows `academic_writing_default`, `oral_presentation_default`.
- [x] Admin **Rubric builder** loads/saves/deletes via Supabase; templates in `src/data/rubricTemplates.js`.
- [x] `InstructorAssessmentAuthoring` loads rubric dropdown from `rubrics`; `RUBRIC_CATALOG_FALLBACK` if empty/error.
- [x] Default MCQ option strings remain editor-only defaults.

---

## Phase 4 — Subject view (`InstructorSubjectView.jsx`) — **done**

- [x] Attendance **Edit** opens a modal; saves `status`, `notes`, `recorded_by` (platform user) via Supabase.
- [x] Forum **Pin / Lock** toggles `is_pinned` / `is_locked` on `subject_forum_posts`.
- [x] Q&A **Answer** uses a modal; updates `subject_questions` (`answer_text`, `answered_by_instructor_id`, `answered_at`).
- [x] Overview metrics + tab labels use `instructorPortal.subjectDetail.*` i18n; pending grading sum uses `Math.max(0, …)`.

---

## Phase 5 — Optional

- [ ] Use `instructor_course_settings` for Build Lesson default release mode / toggles.
- [ ] `InstructorQuestionBank.jsx`: optional CLO/rubric pickers from DB (`subject_learning_outcomes`).

---

## Files already data-backed (no change required for “dynamic” core)

- `InstructorBuildLesson.jsx`, `InstructorLessonPreview.jsx` — `class_lessons` + elements + CLOs.
- `InstructorQuestionBank.jsx` — `subject_question_bank` CRUD (defaults/`ENG101` fallback are UX only).
- `InstructorAssessmentAuthoring.jsx` — persists exams + `subject_exam_questions` + `assessment_settings`.
