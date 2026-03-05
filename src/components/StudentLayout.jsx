import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
  LayoutDashboard,
  User,
  FolderOpen,
  Lock,
  BookOpen,
  BookMarked,
  PenLine,
  Hourglass,
  Calendar,
  BarChart3,
  FileText,
  GitBranch,
  Receipt,
  CreditCard,
  Trophy,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  Megaphone,
  HelpCircle,
  ScrollText,
  Home,
} from 'lucide-react'

const STUDENT_PORTAL_BG = '#1a3a6b'
const STUDENT_PORTAL_HOVER = '#254a7a'
const STUDENT_PORTAL_BORDER = 'rgba(255,255,255,0.1)'

const studentNavigation = [
  { name: 'Control panel', translationKey: 'studentPortal.controlPanel', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My profile', translationKey: 'studentPortal.myProfile', href: '/student/profile', icon: User },
  { name: 'Document Center', translationKey: 'studentPortal.documentCenter', href: '/student/coming-soon', icon: FolderOpen },
  { name: 'Comments and blocking', translationKey: 'studentPortal.commentsBlocking', href: '/student/coming-soon', icon: Lock },
  { name: 'My courses', translationKey: 'studentPortal.myCourses', href: '/courses', icon: BookMarked },
  { name: 'Course Guide', translationKey: 'studentPortal.courseGuide', href: '/student/course-guide', icon: BookOpen },
  { name: 'Course registration', translationKey: 'studentPortal.courseRegistration', href: '/student/enroll', icon: PenLine },
  { name: 'Waiting list', translationKey: 'studentPortal.waitingList', href: '/student/coming-soon', icon: Hourglass },
  { name: 'Class schedule', translationKey: 'studentPortal.classSchedule', href: '/student/schedule', icon: Calendar },
  { name: 'Grades and results', translationKey: 'studentPortal.gradesResults', href: '/student/grades', icon: BarChart3 },
  { name: 'Academic record', translationKey: 'studentPortal.academicRecord', href: '/student/grades', icon: FileText },
  { name: 'Graduation Path', translationKey: 'studentPortal.graduationPath', href: '/student/graduation-path', icon: GitBranch },
  { name: 'Bills and fees', translationKey: 'studentPortal.billsFees', href: '/student/payments', icon: Receipt },
  { name: 'Electronic payment', translationKey: 'studentPortal.electronicPayment', href: '/student/payments', icon: CreditCard },
  { name: 'Grants and discounts', translationKey: 'studentPortal.grantsDiscounts', href: '/student/coming-soon', icon: Trophy },
  { name: 'Order Center', translationKey: 'studentPortal.orderCenter', href: '/student/coming-soon', icon: ClipboardList },
  { name: 'Academic Advising', translationKey: 'studentPortal.academicAdvising', href: '/student/coming-soon', icon: GraduationCap },
  { name: 'notifications', translationKey: 'studentPortal.notifications', href: '/student/coming-soon', icon: Bell },
  { name: 'Advertisements', translationKey: 'studentPortal.advertisements', href: '/student/coming-soon', icon: Megaphone },
  { name: 'Help Center', translationKey: 'studentPortal.helpCenter', href: '/student/coming-soon', icon: HelpCircle },
  { name: 'Search', translationKey: 'common.search', href: '/student/coming-soon', icon: Search },
  { name: 'Activity log', translationKey: 'studentPortal.activityLog', href: '/student/coming-soon', icon: ScrollText },
]

const STUDENT_NAV_SECTIONS = [
  { labelKey: 'studentPortal.main', labelFallback: 'Main', items: ['Control panel', 'My profile', 'Document Center', 'Comments and blocking'] },
  { labelKey: 'studentPortal.academicRegistration', labelFallback: 'Academic Registration', items: ['My courses', 'Course Guide', 'Course registration', 'Waiting list', 'Class schedule'] },
  { labelKey: 'studentPortal.academicRecordSection', labelFallback: 'Academic Record', items: ['Grades and results', 'Academic record', 'Graduation Path'] },
  { labelKey: 'studentPortal.financialAffairs', labelFallback: 'Financial Affairs', items: ['Bills and fees', 'Electronic payment', 'Grants and discounts'] },
  { labelKey: 'studentPortal.studentServices', labelFallback: 'Student Services', items: ['Order Center', 'Academic Advising'] },
  { labelKey: 'studentPortal.communicationSupport', labelFallback: 'Communication and Support', items: ['notifications', 'Advertisements', 'Help Center', 'Search', 'Activity log'] },
]

export default function StudentLayout({ children }) {
  const { t } = useTranslation()
  const { isRTL, language, changeLanguage } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)
  const { user, userRole, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login/student')
  }

  const handleLanguageChange = (lang) => {
    changeLanguage(lang)
    setLangMenuOpen(false)
  }

  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/dashboard') return t('studentPortal.controlPanel', 'Control panel')
    if (path.startsWith('/student/profile')) return t('studentPortal.myProfile', 'My profile')
    if (path.startsWith('/student/schedule')) return t('studentPortal.classSchedule', 'Class schedule')
    if (path.startsWith('/student/graduation-path')) return t('studentPortal.graduationPath', 'Graduation Path')
    if (path.startsWith('/student/grades')) return t('studentPortal.gradesResults', 'Grades and results')
    if (path.startsWith('/student/enroll')) return t('studentPortal.courseRegistration', 'Course registration')
    if (path.startsWith('/student/course-guide')) return t('studentPortal.courseGuide', 'Course Guide')
    if (path === '/courses') return t('studentPortal.myCourses', 'My courses')
    if (path.startsWith('/student/payments')) return t('studentPortal.billsFees', 'Bills and fees')
    const match = path.match(/\/student\/([^/]+)/)
    if (match) return studentNavigation.find(n => n.href === path)?.name || match[1]
    return t('studentPortal.studentPortal', 'Student Portal')
  }

  return (
    <div className={`min-h-screen bg-slate-100 flex ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content: margin for sidebar — left in English (LTR), right in Arabic (RTL) */}
      <div className={`flex-1 flex flex-col min-w-0 ${isRTL ? 'lg:mr-72' : 'lg:ml-72'}`}>
        {/* Top header - student portal colour #1a3a6b */}
        <header className="text-white shadow-md sticky top-0 z-30 flex-shrink-0" style={{ backgroundColor: STUDENT_PORTAL_BG }}>
          <div className={`flex items-center justify-between h-14 px-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:opacity-90"
                style={{ backgroundColor: 'transparent' }}
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="text-slate-200 hover:text-white text-sm"
              >
                {t('studentPortal.exit', 'Exit')}
              </button>
              <span className="text-slate-400 hidden sm:inline">|</span>
              <span className="font-medium truncate max-w-[140px] sm:max-w-[200px]">
                {user?.email?.split('@')[0] || 'Student'}
              </span>
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-slate-900 font-bold text-sm flex-shrink-0">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Language switcher */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:opacity-90 text-slate-200 text-sm font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <span>{language === 'ar' ? 'العربية' : 'English'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {langMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setLangMenuOpen(false)} />
                    <div className={`absolute top-full mt-1 py-1 min-w-[120px] rounded-lg shadow-lg z-20 ${isRTL ? 'right-0' : 'left-0'}`} style={{ backgroundColor: STUDENT_PORTAL_HOVER }}>
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-90 transition-colors ${language === 'en' ? 'text-amber-400 font-medium' : 'text-slate-200'}`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => handleLanguageChange('ar')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:opacity-90 transition-colors ${language === 'ar' ? 'text-amber-400 font-medium' : 'text-slate-200'}`}
                      >
                        العربية
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button className="p-2 rounded-lg hover:opacity-90 relative" title={t('studentPortal.notifications', 'Notifications')}>
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:opacity-90" title={t('common.search', 'Search')}>
                <Search className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-1 text-slate-300 text-sm">
                <span>{getBreadcrumb()}</span>
                <span className="text-slate-500">/</span>
                <span>{t('studentPortal.studentPortal', 'Student Portal')}</span>
                <span className="text-slate-500">/</span>
                <span>{t('studentPortal.main', 'Main')}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isRTL ? 'rtl' : 'ltr'}`}>{children}</main>
      </div>

      {/* Sidebar: #1a3a6b, left in English (LTR), right in Arabic (RTL) */}
      <aside
        className={`fixed top-0 bottom-0 w-72 shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isRTL ? 'right-0' : 'left-0'
        } ${sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}`}
        style={{ backgroundColor: STUDENT_PORTAL_BG }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-14 px-4 flex-shrink-0" style={{ borderBottom: `1px solid ${STUDENT_PORTAL_BORDER}` }}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img src="/assets/IBU Logo.png" alt="IBU" className="h-8 w-auto object-contain" />
              <div className="text-white font-semibold text-sm">
                <div>{t('studentPortal.ibuUniversity', 'IBU University')}</div>
                <div className="text-slate-400 text-xs">{t('studentPortal.studentPortal', 'Student Portal')}</div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {STUDENT_NAV_SECTIONS.map((section) => (
              <div key={section.labelKey}>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-3 mb-2">
                  {t(section.labelKey, { defaultValue: section.labelFallback })}
                </p>
                <div className="space-y-0.5">
                  {studentNavigation
                    .filter((n) => section.items.includes(n.name))
                    .map((item) => {
                      const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                            isActive ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300 hover:bg-[#254a7a]'
                          } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{t(item.translationKey, { defaultValue: item.name })}</span>
                        </Link>
                      )
                    })}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-3 border-t flex-shrink-0" style={{ borderColor: STUDENT_PORTAL_BORDER }}>
            <Link to="/dashboard" onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Home className="w-4 h-4" />
              {t('studentPortal.home', 'Home')}
            </Link>
            <p className="text-slate-500 text-xs px-3 pt-2">{t('studentPortal.version', 'Version 1.0.0')}</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
