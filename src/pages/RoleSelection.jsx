import { useNavigate } from 'react-router-dom'
import { GraduationCap, Shield, User, BookOpen, Sparkles } from 'lucide-react'

const roles = [
  {
    id: 'admin',
    name: 'Super Admin',
    description: 'Manage universities and create colleges',
    icon: Shield,
    gradient: 'from-blue-600 to-indigo-700',
    route: '/login/admin',
    color: 'blue',
  },
  {
    id: 'user',
    name: 'College Admin',
    description: 'Manage your college settings and operations',
    icon: GraduationCap,
    gradient: 'from-purple-600 to-pink-700',
    route: '/login/college',
    color: 'purple',
  },
  {
    id: 'instructor',
    name: 'Instructor',
    description: 'Access your teaching dashboard and classes',
    icon: User,
    gradient: 'from-emerald-600 to-teal-700',
    route: '/login/instructor',
    color: 'emerald',
  },
  {
    id: 'student',
    name: 'Student',
    description: 'View your courses, grades, and schedule',
    icon: BookOpen,
    gradient: 'from-orange-600 to-red-700',
    route: '/login/student',
    color: 'orange',
  },
]

export default function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src="/assets/IBU Logo.png" 
              alt="IBU Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Imam Bukhari University
          </h1>
          <p className="text-2xl font-semibold text-accent-300 mb-2">IBU</p>
          <p className="text-xl text-gray-300">Select your role to continue</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.route)}
                className="group relative bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${role.gradient} rounded-2xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
                    {role.name}
                  </h2>
                  
                  <p className="text-gray-300 text-left mb-4">
                    {role.description}
                  </p>
                  
                  <div className="flex items-center text-white/80 group-hover:text-white transition-colors">
                    <span className="text-sm font-medium">Continue</span>
                    <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <p className="text-center mt-12 text-gray-400 text-sm">
          © 2025 University Management System. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}



