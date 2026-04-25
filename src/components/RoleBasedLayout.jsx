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
  const { userRole, user, loading } = useAuth()
  const location = useLocation()

  // Prevent layout flash on refresh while role is being fetched
  if (loading || (user && !userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (userRole === 'student') {
    const isELearning = location.pathname.startsWith('/student/elearning')
    return isELearning ? <StudentELearningLayout>{children}</StudentELearningLayout> : <StudentLayout>{children}</StudentLayout>
  }
  if (userRole === 'instructor') {
    return <InstructorLayout>{children}</InstructorLayout>
  }
  return <Layout>{children}</Layout>
}
