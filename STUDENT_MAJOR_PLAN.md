# Student Major Plan (Degree Plan) — Where It Comes From

## How the graduation path gets the major plan

The **major plan** (degree plan) used for the **Graduation Path** and for **Course registration** is resolved in this order:

1. **Explicit assignment**  
   If the student has a row in **`student_major_sheets`** (with `is_active = true`), that row’s **`major_sheet_id`** is used.  
   So the plan is “whatever was explicitly assigned” to this student.

2. **Derived from the student’s major**  
   If there is **no** row in `student_major_sheets`, the app uses the student’s **major** (`students.major_id`) and picks an active **major_sheet** for that major:
   - **`major_sheets.major_id`** = student’s `major_id`
   - **`major_sheets.is_active`** = true
   - Prefer a sheet whose **`academic_year`** matches the student’s admission year (from **`students.enrollment_date`**), or the latest active sheet if none match.

So in practice: **the plan comes from the major (the major’s degree plan)** when you don’t assign one explicitly.

## Where do you “set” the student major sheet?

- **Right now there is no UI in the app** that inserts or updates **`student_major_sheets`**.  
  So you don’t “set” it anywhere in the interface; the app **derives** the plan from the student’s major (and admission year) as above.

- **If you want to assign a specific plan to a student** (e.g. a particular cohort version), you can:
  1. **Manually (SQL)**  
     Insert (or update) a row in **`student_major_sheets`**:
     - `student_id`, `major_sheet_id`, `admission_year`, `is_active = true`.
  2. **Future UI**  
     Add an “Assign major plan” (or “Degree plan”) step in:
     - Student create/edit (admin), or  
     - A dedicated “Student degree plan” or “Cohort” screen  
     that inserts/updates **`student_major_sheets`**.

## Summary

- **“Where do I set the student major sheet?”**  
  There is no setting in the app yet; it’s either from **`student_major_sheets`** (if you inserted a row) or **derived from the major plan** (student’s major + admission year).

- **“Doesn’t it come from the major plan?”**  
  Yes. When no row exists in **`student_major_sheets`**, the app uses the **major plan** for the student’s **major** (and optionally admission year). So the graduation path and course registration already use the major plan in that case.
