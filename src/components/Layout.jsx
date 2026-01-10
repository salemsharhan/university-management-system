import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  CalendarDays,
  School,
  BookMarked,
  Layers,
  Library,
  DollarSign,
} from 'lucide-react'

// Navigation Item Component with Submenu Support
function NavigationItem({ item, location, setSidebarOpen, t }) {
  const { isRTL } = useLanguage()
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  const hasSubmenu = item.submenu && item.submenu.length > 0
  const isSubmenuActive = hasSubmenu && item.submenu.some(sub => location.pathname === sub.href)
  const [submenuOpen, setSubmenuOpen] = useState(isActive || isSubmenuActive)

  useEffect(() => {
    if (hasSubmenu && item.submenu.some(sub => location.pathname === sub.href)) {
      setSubmenuOpen(true)
    }
  }, [location.pathname, hasSubmenu, item.submenu])

  return (
    <div>
      <Link
        to={item.href}
        onClick={(e) => {
          if (hasSubmenu) {
            e.preventDefault()
            setSubmenuOpen(!submenuOpen)
          } else {
            setSidebarOpen(false)
          }
        }}
        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive || isSubmenuActive
            ? 'bg-primary-gradient text-white shadow-lg'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{t(item.translationKey)}</span>
        </div>
        {hasSubmenu && (
          <ChevronDown className={`w-4 h-4 transition-transform ${submenuOpen ? 'rotate-180' : ''}`} />
        )}
      </Link>
      {hasSubmenu && submenuOpen && (
        <div className={`${isRTL ? 'mr-8' : 'ml-8'} mt-1 space-y-1`}>
          {item.submenu.map((subItem) => {
            const isSubActive = location.pathname === subItem.href
            return (
              <Link
                key={subItem.name}
                to={subItem.href}
                onClick={() => setSidebarOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm transition-all ${
                  isSubActive
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t(subItem.translationKey)}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const navigation = [
  { name: 'Dashboard', translationKey: 'navigation.dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'user', 'instructor', 'student'] },
  { 
    name: 'Colleges', 
    translationKey: 'navigation.colleges',
    href: '/admin/colleges', 
    icon: Building2, 
    roles: ['admin'],
    submenu: [
      { name: 'All Colleges', translationKey: 'navigation.allColleges', href: '/admin/colleges' },
      { name: 'University Settings', translationKey: 'navigation.universitySettings', href: '/admin/university-settings' },
    ]
  },
  { name: 'Academic Years', translationKey: 'navigation.academicYears', href: '/academic/years', icon: CalendarDays, roles: ['admin', 'user'] },
  { name: 'Semesters', translationKey: 'navigation.semesters', href: '/academic/semesters', icon: Calendar, roles: ['admin', 'user'] },
  { name: 'Departments', translationKey: 'navigation.departments', href: '/academic/departments', icon: Building2, roles: ['admin', 'user'] },
  { name: 'Majors', translationKey: 'navigation.majors', href: '/academic/majors', icon: BookMarked, roles: ['admin', 'user'] },
  { name: 'Subjects', translationKey: 'navigation.subjects', href: '/academic/subjects', icon: BookOpen, roles: ['admin', 'user'] },
  { name: 'Classes', translationKey: 'navigation.classes', href: '/academic/classes', icon: Library, roles: ['admin', 'user'] },
  { 
    name: 'Enrollments', 
    translationKey: 'navigation.enrollments',
    href: '/enrollments', 
    icon: GraduationCap, 
    roles: ['admin', 'user'],
    submenu: [
      { name: 'All Enrollments', translationKey: 'navigation.allEnrollments', href: '/enrollments' },
      { name: 'Bulk Enrollment', translationKey: 'navigation.bulkEnrollment', href: '/enrollments/bulk' },
    ]
  },
  { name: 'Students', translationKey: 'navigation.students', href: '/students', icon: GraduationCap, roles: ['admin', 'user', 'instructor'] },
  { name: 'Instructors', translationKey: 'navigation.instructors', href: '/instructors', icon: Users, roles: ['admin', 'user'] },
  { 
    name: 'Courses', 
    translationKey: 'navigation.courses', 
    href: '/courses', 
    icon: BookOpen, 
    roles: ['admin', 'user'],
    submenu: [
      { name: 'All Courses', translationKey: 'navigation.allCourses', href: '/courses' },
    ]
  },
  { name: 'My Subjects', translationKey: 'navigation.mySubjects', href: '/courses', icon: BookOpen, roles: ['student'] },
  { name: 'My Subjects', translationKey: 'navigation.mySubjects', href: '/courses', icon: BookOpen, roles: ['instructor'] },
  { name: 'Schedule', translationKey: 'navigation.schedule', href: '/schedule', icon: Calendar, roles: ['admin', 'user', 'instructor', 'student'] },
  { 
    name: 'Examinations', 
    translationKey: 'navigation.examinations',
    href: '/examinations', 
    icon: FileText, 
    roles: ['admin', 'user', 'instructor'],
    submenu: [
      { name: 'Dashboard', translationKey: 'navigation.examinationDashboard', href: '/examinations/dashboard' },
      { name: 'All Examinations', translationKey: 'navigation.allExaminations', href: '/examinations' },
      { name: 'Statistics', translationKey: 'navigation.statistics', href: '/examinations/statistics' },
      { name: 'Conflicts', translationKey: 'navigation.conflicts', href: '/examinations/conflicts' },
    ]
  },
  { name: 'Attendance', translationKey: 'navigation.attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'user', 'instructor'] },
  { name: 'My Attendance', translationKey: 'navigation.myAttendance', href: '/student/attendance', icon: Calendar, roles: ['student'] },
  { 
    name: 'Grading Management', 
    translationKey: 'navigation.gradingManagement',
    href: '/grading', 
    icon: FileText, 
    roles: ['admin', 'user', 'instructor'],
    submenu: [
      { name: 'Grade Management', translationKey: 'navigation.gradeManagement', href: '/grading' },
      { name: 'Student Grades', translationKey: 'navigation.studentGrades', href: '/grading/students' },
      { name: 'Transcripts', translationKey: 'navigation.transcripts', href: '/grading/transcripts' },
      { name: 'Grade Entry', translationKey: 'navigation.gradeEntry', href: '/grading' },
      { name: 'Analytics', translationKey: 'navigation.analytics', href: '/grading/analytics' },
    ]
  },
  { name: 'My Grades', translationKey: 'navigation.myGrades', href: '/student/grades', icon: FileText, roles: ['student'] },
  { name: 'Payments', translationKey: 'navigation.payments', href: '/student/payments', icon: DollarSign, roles: ['student'] },
  { 
    name: 'Finance Affairs', 
    translationKey: 'navigation.financeAffairs',
    href: '/finance/invoices', 
    icon: DollarSign, 
    roles: ['admin', 'user'],
    submenu: [
      { name: 'Invoice Management', translationKey: 'navigation.invoiceManagement', href: '/finance/invoices' },
      { name: 'Create Invoice', translationKey: 'navigation.createInvoice', href: '/finance/invoices/create' },
      { name: 'Credit Wallet', translationKey: 'navigation.creditWallet', href: '/finance/wallet' },
      { name: 'Fee Structure', translationKey: 'navigation.feeStructure', href: '/finance/configuration' },
      { name: 'Reports', translationKey: 'navigation.reports', href: '/finance/reports' },
      { name: 'Donations', translationKey: 'navigation.donations', href: '/finance/donations' },
      { name: 'Installment Plans', translationKey: 'navigation.installmentPlans', href: '/finance/installments' },
      { name: 'Scholarships', translationKey: 'navigation.scholarships', href: '/finance/scholarships' },
    ]
  },
  { 
    name: 'Admissions', 
    translationKey: 'navigation.admissions',
    href: '/admissions/applications', 
    icon: GraduationCap, 
    roles: ['admin', 'user'],
    submenu: [
      { name: 'All Applications', translationKey: 'navigation.allApplications', href: '/admissions/applications' },
      { name: 'Pending Requests', translationKey: 'navigation.pendingRequests', href: '/admissions/applications?status=pending' },
      { name: 'New Application', translationKey: 'navigation.newApplication', href: '/admissions/applications/create' },
    ]
  },
  { 
    name: 'Settings', 
    translationKey: 'navigation.settings',
    href: '/settings', 
    icon: Settings, 
    roles: ['admin', 'user', 'instructor'],
    submenu: [
      { name: 'User Settings', translationKey: 'navigation.userSettings', href: '/settings' },
      { name: 'University Settings', translationKey: 'navigation.universitySettings', href: '/admin/university-settings' },
    ]
  },
]

export default function Layout({ children }) {
  const { t } = useTranslation()
  const { language, changeLanguage, isRTL } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const { user, userRole, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  // Filter navigation based on user role
  // Show all items if userRole is not yet loaded (during initial load)
  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    if (!userRole) return true // Show all during loading
    return item.roles.includes(userRole)
  })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleLanguageChange = (lang) => {
    changeLanguage(lang)
    setLangMenuOpen(false)
  }

  return (
    <div className={`min-h-screen bg-gray-50 flex ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:fixed lg:z-30 ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0`}>
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
              <img 
                src="/assets/IBU Logo.png" 
                alt="IBU Logo" 
                className="h-18 w-auto object-contain"
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <NavigationItem
                key={item.name}
                item={item}
                location={location}
                setSidebarOpen={setSidebarOpen}
                t={t}
              />
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'} px-4 py-3 rounded-xl bg-gray-50`}>
              <div className="w-10 h-10 bg-primary-gradient rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 flex-shrink-0">
          <div className={`flex items-center justify-between h-16 px-6`}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1"></div>

            <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {language === 'ar' ? (
                    <span className="text-2xl">🇸🇦</span>
                  ) : (
                    <span className="text-2xl">🇬🇧</span>
                  )}
                </button>
                {langMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setLangMenuOpen(false)}
                    />
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20`}>
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`w-full flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${language === 'en' ? 'bg-gray-50' : ''}`}
                      >
                        <span className="text-xl">🇬🇧</span>
                        <span>English</span>
                      </button>
                      <button
                        onClick={() => handleLanguageChange('ar')}
                        className={`w-full flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${language === 'ar' ? 'bg-gray-50' : ''}`}
                      >
                        <span className="text-xl">🇸🇦</span>
                        <span>العربية</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors`}
                >
                  <div className="w-8 h-8 bg-primary-gradient rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20`}>
                      <button
                        onClick={handleSignOut}
                        className={`w-full flex items-center ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'} px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{t('common.signOut')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto p-6 ${isRTL ? 'rtl' : 'ltr'}`}>{children}</main>
      </div>
    </div>
  )
}

