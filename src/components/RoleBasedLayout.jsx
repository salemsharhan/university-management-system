import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'
import StudentLayout from './StudentLayout'
import InstructorLayout from './InstructorLayout'

/**
 * Renders Layout (admin/college), StudentLayout (student), or InstructorLayout (instructor) based on user role.
 */
export default function RoleBasedLayout({ children }) {
  const { userRole } = useAuth()
  if (userRole === 'student') {
    return <StudentLayout>{children}</StudentLayout>
  }
  if (userRole === 'instructor') {
    return <InstructorLayout>{children}</InstructorLayout>
  }
  return <Layout>{children}</Layout>
}
