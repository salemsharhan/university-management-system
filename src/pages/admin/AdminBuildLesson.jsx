import AdminSubjectLessonBuilder from './AdminSubjectLessonBuilder'

/** Admin builds subject-level lesson templates. Instructors build session-wise lessons at /instructor/build-lessons. */
export default function AdminBuildLesson() {
  return <AdminSubjectLessonBuilder />
}
