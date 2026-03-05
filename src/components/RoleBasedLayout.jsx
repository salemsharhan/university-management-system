import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'
import StudentLayout from './StudentLayout'

/**
 * Renders Layout (admin/college/instructor) or StudentLayout (student) based on user role.
 * Use this wrapper for all protected routes so students get the IBU-style portal layout.
 */
export default function RoleBasedLayout({ children }) {
  const { userRole } = useAuth()
  if (userRole === 'student') {
    return <StudentLayout>{children}</StudentLayout>
  }
  return <Layout>{children}</Layout>
}
