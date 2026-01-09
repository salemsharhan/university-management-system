import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { Users, GraduationCap, BookOpen, Calendar, TrendingUp, Award } from 'lucide-react'

export default function Dashboard() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()

  const stats = [
    {
      name: t('dashboard.totalStudents'),
      value: '2,458',
      change: '+12.5%',
      changeType: 'positive',
      icon: GraduationCap,
      color: 'bg-blue-500',
    },
    {
      name: t('dashboard.activeInstructors'),
      value: '142',
      change: '+3.2%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-green-500',
    },
    {
      name: t('dashboard.courses'),
      value: '324',
      change: '+8.1%',
      changeType: 'positive',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
    {
      name: t('dashboard.thisSemester'),
      value: 'Fall 2025',
      change: t('common.active'),
      changeType: 'neutral',
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ]

  const recentActivities = [
    { id: 1, type: 'enrollment', student: 'Ahmed Ali', course: 'Computer Science 101', time: '2 hours ago' },
    { id: 2, type: 'grade', student: 'Sarah Mohammed', course: 'Mathematics 201', time: '4 hours ago' },
    { id: 3, type: 'enrollment', student: 'Omar Hassan', course: 'Physics 150', time: '6 hours ago' },
    { id: 4, type: 'attendance', student: 'Fatima Ibrahim', course: 'Chemistry 120', time: '8 hours ago' },
  ]

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.welcomeBack')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p
                  className={`text-sm mt-2 ${
                    stat.changeType === 'positive'
                      ? 'text-green-600'
                      : stat.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div className={`${stat.color} rounded-xl p-3`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} mb-6`}>
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.recentActivities')}</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              {t('dashboard.viewAll')}
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.student} - {activity.course}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('dashboard.quickStats')}</h2>
          <div className="space-y-4">
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-blue-50 rounded-xl`}>
              <div>
                <p className="text-sm text-gray-600">{t('dashboard.enrollmentRate')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">94.2%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-green-50 rounded-xl`}>
              <div>
                <p className="text-sm text-gray-600">{t('dashboard.averageGPA')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">3.65</p>
              </div>
              <Award className="w-8 h-8 text-green-600" />
            </div>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'justify-between'} p-4 bg-purple-50 rounded-xl`}>
              <div>
                <p className="text-sm text-gray-600">{t('dashboard.attendance')}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">87.3%</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

