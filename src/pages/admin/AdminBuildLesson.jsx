import InstructorBuildLesson from '../instructor/InstructorBuildLesson'

/** Full lesson creation & metadata — admin only. Instructors use /instructor/build-lessons (elements only). */
export default function AdminBuildLesson() {
  return <InstructorBuildLesson variant="admin" />
}
