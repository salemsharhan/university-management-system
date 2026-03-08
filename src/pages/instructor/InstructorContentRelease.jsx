import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { Settings, Calendar, Download } from 'lucide-react'

const PORTAL_BG = '#1a3a6b'

const defaultSchedule = [
  { lesson: 'مقدمة في مهارات الكتابة', lessonEn: 'Introduction to Writing Skills', unit: '1', mode: 'immediate', modeAr: 'فوري', date: null, condition: null, status: 'published', statusAr: 'منشور' },
  { lesson: 'القراءة النقدية - المستوى 1', lessonEn: 'Critical Reading - Level 1', unit: '2', mode: 'scheduled', modeAr: 'مجدول', date: '10 مارس 2025 - 08:00 ص', condition: null, status: 'upcoming', statusAr: 'قادم' },
  { lesson: 'مهارات الاستماع الفعّال', lessonEn: 'Effective Listening Skills', unit: '3', mode: 'conditional', modeAr: 'مشروط', date: null, condition: 'إتمام الوحدة 2', conditionEn: 'Completion of Unit 2', status: 'draft', statusAr: 'مسودة' },
  { lesson: 'الكتابة الأكاديمية المتقدمة', lessonEn: 'Advanced Academic Writing', unit: '4', mode: 'conditional', modeAr: 'مشروط', date: null, condition: 'إتمام الوحدة 3 + اختبار الوحدة 3', conditionEn: 'Completion of Unit 3 + Unit 3 Test', status: 'draft', statusAr: 'مسودة' },
]

export default function InstructorContentRelease() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const [releaseMode, setReleaseMode] = useState('specific')
  const [completionTracking, setCompletionTracking] = useState('enabled')
  const [showProgress, setShowProgress] = useState('yes')
  const [schedule] = useState(defaultSchedule)

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <p className="text-sm text-slate-500">
        {t('instructorPortal.breadcrumbMain')} › {t('instructorPortal.dashboard')} › {t('instructorPortal.contentRelease')}
      </p>

      <h1 className="text-2xl font-bold text-slate-800">
        {t('instructorPortal.contentReleaseScheduling', 'Content Release and Scheduling')}
      </h1>

      {/* Default Release Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Settings className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">{t('instructorPortal.defaultReleaseSettings', 'Default Release Settings for the Course')}</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.defaultReleaseMode', 'Default Release Mode')}</label>
            <select value={releaseMode} onChange={(e) => setReleaseMode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white flex items-center">
              <option value="specific">{language === 'ar' ? 'بتاريخ ووقت محدد' : 'Specific Date and Time'}</option>
              <option value="immediate">{language === 'ar' ? 'فوري' : 'Immediate'}</option>
              <option value="conditional">{language === 'ar' ? 'مشروط' : 'Conditional'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.completionTracking', 'Completion Tracking')}</label>
            <select value={completionTracking} onChange={(e) => setCompletionTracking(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="enabled">{language === 'ar' ? 'مفعل' : 'Enabled'}</option>
              <option value="disabled">{language === 'ar' ? 'معطل' : 'Disabled'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('instructorPortal.showProgressToStudents', 'Show Progress to Students')}</label>
            <select value={showProgress} onChange={(e) => setShowProgress(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
              <option value="yes">{language === 'ar' ? 'نعم' : 'Yes'}</option>
              <option value="no">{language === 'ar' ? 'لا' : 'No'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lessons Release Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center gap-2 px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Calendar className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">{t('instructorPortal.lessonsReleaseSchedule', 'Lessons Release Schedule')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.lesson', 'Lesson')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit', 'Unit')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.releaseMode', 'Release Mode')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.releaseDate', 'Release Date')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.condition', 'Condition')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                <th className={`py-3 px-4 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className={`py-3 px-4 text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? row.lesson : row.lessonEn}</td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} {row.unit}</td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      row.mode === 'immediate' ? 'bg-green-100 text-green-800' :
                      row.mode === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {language === 'ar' ? row.modeAr : row.mode}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.date || '—'}</td>
                  <td className={`py-3 px-4 text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{row.condition ? (language === 'ar' ? row.condition : row.conditionEn) : '—'}</td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      row.status === 'published' ? 'bg-green-100 text-green-800' :
                      row.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {language === 'ar' ? row.statusAr : row.status}
                    </span>
                  </td>
                  <td className={`py-3 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <button type="button" className="px-3 py-1.5 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: PORTAL_BG }}>
                      {t('common.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Content Completion Report */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="font-semibold text-slate-800">{t('instructorPortal.contentCompletionReport', 'Content Completion Report')}</h3>
          <button type="button" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4" />
            {t('instructorPortal.export', 'Export')}
          </button>
        </div>
        <div className="overflow-x-auto p-4">
          <p className="text-slate-500 text-sm mb-4">{t('instructorPortal.contentCompletionReportDesc', 'Student progress across units.')}</p>
          <table className="w-full border-collapse text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.student', 'Student')}</th>
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} 1</th>
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} 2</th>
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} 3</th>
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.unit')} 4</th>
                <th className={`py-2 px-3 font-medium text-slate-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('instructorPortal.total', 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'أحمد محمد', nameEn: 'Ahmed Mohammed', u1: '100%', u2: '100%', u3: '60%', u4: '—', total: 65 },
                { name: 'سارة العلي', nameEn: 'Sara Al-Ali', u1: '50%', u2: '75%', u3: '100%', u4: '—', total: 75 },
                { name: 'خالد الرشيد', nameEn: 'Khalid Al-Rashid', u1: '100%', u2: '—', u3: '—', u4: '—', total: 25 },
                { name: 'نورة السعد', nameEn: 'Nora Al-Saad', u1: '100%', u2: '100%', u3: '100%', u4: '30%', total: 85 },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className={`py-2 px-3 text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`}>{language === 'ar' ? row.name : row.nameEn}</td>
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>{row.u1}</td>
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>{row.u2}</td>
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>{row.u3}</td>
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>{row.u4}</td>
                  <td className={`py-2 px-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${row.total}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
