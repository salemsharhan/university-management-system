import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { checkFinancePermission } from '../utils/financePermissions'
import { BookOpen, Mail, Lock, Eye, EyeOff, ArrowLeft, GraduationCap, AlertCircle } from 'lucide-react'

export default function LoginStudent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signOut, user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && userRole === 'student') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, userRole, authLoading, navigate])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-700 to-orange-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await signIn(email, password, 'student')
      if (signInError) throw signInError

      // Check if student has FA_LGN (Login permission) based on financial milestone
      // For login, check if student has at least one active semester with PM10+ milestone
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id, financial_hold_reason_code, current_status_code')
        .eq('email', email)
        .eq('status', 'active')
        .single()

      if (studentError) {
        console.error('Error fetching student data:', studentError)
        // Allow login even if student data fetch fails (might be new account)
        navigate('/dashboard')
        return
      }

      // Check if student has at least one active semester with PM10+ milestone for login
      const { data: semesterStatuses, error: statusError } = await supabase
        .from('student_semester_financial_status')
        .select('financial_milestone_code')
        .eq('student_id', studentData.id)
        .in('financial_milestone_code', ['PM10', 'PM30', 'PM60', 'PM90', 'PM100'])
        .limit(1)

      // If no semester status found, default to PM00 (no payment)
      const hasLoginAccess = semesterStatuses && semesterStatuses.length > 0
      const loginMilestone = hasLoginAccess ? semesterStatuses[0].financial_milestone_code : 'PM00'

      // Check FA_LGN permission (requires PM10)
      const permission = checkFinancePermission(
        'SA_LGN',
        loginMilestone,
        studentData.financial_hold_reason_code || null
      )

      if (!permission.allowed) {
        // Sign out the user since they don't have permission
        if (signOut) {
          await signOut()
        }
        setError(`Access Denied: ${permission.reason || 'You need to make an initial payment (10%) to access the student portal. Please contact the finance office or make a payment.'}`)
        setLoading(false)
        return
      }

      // Check if student status allows login
      const allowedStatuses = ['ENAC', 'ACAC', 'ACPR', 'ENCF', 'ENPN']
      if (!allowedStatuses.includes(studentData.current_status_code || '')) {
        // Sign out the user since their status doesn't allow login
        if (signOut) {
          await signOut()
        }
        setError(`Access Denied: Your account status (${studentData.current_status_code || 'Unknown'}) does not allow portal access. Please contact the admissions office.`)
        setLoading(false)
        return
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-red-700 to-orange-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Back button */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 flex items-center space-x-2 text-white/80 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Roles</span>
      </Link>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/assets/IBU Logo.png" 
                alt="IBU Logo" 
                className="h-20 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Student Portal</h1>
            <p className="text-orange-100">Access your courses and grades</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 rounded-xl text-red-100 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/90 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/60" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="student@college.edu"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/60" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all backdrop-blur-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-white/60 hover:text-white" />
                  ) : (
                    <Eye className="h-5 w-5 text-white/60 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-white/30 bg-white/10 text-orange-600 focus:ring-orange-400" />
                <span className="ml-2 text-sm text-white/80">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-white/90 hover:text-white">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In as Student'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-white/60 text-sm">
          Student Portal • University Management System
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}


