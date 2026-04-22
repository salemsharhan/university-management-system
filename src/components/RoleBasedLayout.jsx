import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'
import StudentLayout from './StudentLayout'
import InstructorLayout from './InstructorLayout'
import StudentELearningLayout from './StudentELearningLayout'
import { useLocation } from 'react-router-dom'

/**
 * Renders Layout (admin/college), StudentLayout (student), or InstructorLayout (instructor) based on user role.
 */
export default function RoleBasedLayout({ children }) {
  const { userRole } = useAuth()
  const location = useLocation()
  if (userRole === 'student') {
    const isELearning = location.pathname.startsWith('/student/elearning')
    return isELearning ? <StudentELearningLayout>{children}</StudentELearningLayout> : <StudentLayout>{children}</StudentLayout>
  }
  if (userRole === 'instructor') {
    return <InstructorLayout>{children}</InstructorLayout>
  }
  return <Layout>{children}</Layout>
}
