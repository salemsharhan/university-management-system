import InstructorBuildLesson from '../instructor/InstructorBuildLesson'

/** Full lesson creation & metadata — admin only at /academic/classes/build-lessons. Instructors use /instructor/build-lessons (elements only). */
export default function AdminBuildLesson() {
  return <InstructorBuildLesson variant="admin" />
}
