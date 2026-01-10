import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, BookOpen } from 'lucide-react'

export default function ViewSubject() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [prerequisites, setPrerequisites] = useState([])
  const [corequisites, setCorequisites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubject()
    fetchPrerequisites()
    fetchCorequisites()
  }, [id])

  const fetchSubject = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*, majors(id, name_en, code), instructors(id, name_en, email), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Parse JSONB fields if they exist as strings
      if (data.attendance_rules && typeof data.attendance_rules === 'string') {
        try {
          data.attendance_rules = JSON.parse(data.attendance_rules)
        } catch (e) {
          console.warn('Failed to parse attendance_rules:', e)
        }
      }
      
      if (data.grade_configuration && typeof data.grade_configuration === 'string') {
        try {
          data.grade_configuration = JSON.parse(data.grade_configuration)
        } catch (e) {
          console.warn('Failed to parse grade_configuration:', e)
        }
      }
      
      setSubject(data)
    } catch (err) {
      console.error('Error fetching subject:', err)
      setError(err.message || 'Failed to load subject')
    } finally {
      setLoading(false)
    }
  }

  const fetchPrerequisites = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_prerequisites')
        .select('prerequisite_subject_id')
        .eq('subject_id', id)

      if (error) throw error
      
      if (data && data.length > 0) {
        const subjectIds = data.map(p => p.prerequisite_subject_id)
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, code, name_en, semester_number, majors(id, name_en)')
          .in('id', subjectIds)

        if (subjectsError) throw subjectsError
        setPrerequisites(subjectsData || [])
      } else {
        setPrerequisites([])
      }
    } catch (err) {
      console.error('Error fetching prerequisites:', err)
      setPrerequisites([])
    }
  }

  const fetchCorequisites = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_corequisites')
        .select('corequisite_subject_id')
        .eq('subject_id', id)

      if (error) throw error
      
      if (data && data.length > 0) {
        const subjectIds = data.map(c => c.corequisite_subject_id)
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, code, name_en, semester_number, majors(id, name_en)')
          .in('id', subjectIds)

        if (subjectsError) throw subjectsError
        setCorequisites(subjectsData || [])
      } else {
        setCorequisites([])
      }
    } catch (err) {
      console.error('Error fetching corequisites:', err)
      setCorequisites([])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !subject) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-gray-600 hover:text-gray-900`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('academic.semesters.back')}</span>
        </button>
        <button
          onClick={() => navigate(`/academic/subjects/${id}/edit`)}
          className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all`}
        >
          <Edit className="w-4 h-4" />
          <span>{t('academic.subjects.edit')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'} mb-6`}>
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{subject?.name_en}</h1>
            <p className="text-gray-600">{subject?.code}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.nameAr')}</h3>
              <p className="text-gray-900">{subject?.name_ar || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.subjects.major')}</h3>
              <p className="text-gray-900">{subject?.majors?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.semester')}</h3>
              <p className="text-gray-900">
                {t('academic.subjects.semester')} {subject?.semester_number || 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.type')}</h3>
              <p className="text-gray-900 capitalize">{subject?.type || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.college')}</h3>
              <p className="text-gray-900">
                {subject?.colleges?.name_en || (subject?.is_university_wide ? t('subjectsForm.universityWide') : 'N/A')}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.instructor')}</h3>
              <p className="text-gray-900">
                {subject?.instructors?.name_en || subject?.instructor_name || 'Not assigned'}
              </p>
              {(subject?.instructors?.email || subject?.instructor_email) && (
                <p className="text-sm text-gray-600 mt-1">
                  {subject?.instructors?.email || subject?.instructor_email}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.creditHours')}</h3>
              <p className="text-gray-900">{subject?.credit_hours || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('academic.semesters.status')}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                subject?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {subject?.status || 'active'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.isElective')}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                subject?.is_elective ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {subject?.is_elective ? t('common.yes') : t('common.no')}
              </span>
            </div>
          </div>

          {/* Credit Hours Breakdown */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('academic.semesters.creditHoursConfig')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.creditHours')}</h4>
                <p className="text-gray-900">{subject?.credit_hours || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.theoryHours')}</h4>
                <p className="text-gray-900">{subject?.theory_hours || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.labHours')}</h4>
                <p className="text-gray-900">{subject?.lab_hours || '0'}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.tutorialHours')}</h4>
                <p className="text-gray-900">{subject?.tutorial_hours || '0'}</p>
              </div>
            </div>
          </div>

          {/* Fees */}
          {(subject?.lab_fee || subject?.material_fee) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.optionalInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subject?.lab_fee && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.labFee')}</h4>
                    <p className="text-gray-900">{subject.lab_fee}</p>
                  </div>
                )}
                {subject?.material_fee && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.materialFee')}</h4>
                    <p className="text-gray-900">{subject.material_fee}</p>
                  </div>
                )}
                {subject?.textbook && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.textbook')}</h4>
                    <p className="text-gray-900">{subject.textbook}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prerequisites & Corequisites */}
          {(prerequisites.length > 0 || corequisites.length > 0) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.prerequisitesCorequisites')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prerequisites.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('subjectsForm.prerequisites')}</h4>
                    <div className="space-y-2">
                      {prerequisites.map((prereq) => (
                        <div key={prereq.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">
                            {prereq.code} - {prereq.name_en}
                          </p>
                          {prereq.majors?.name_en && (
                            <p className="text-xs text-gray-600 mt-1">
                              {prereq.majors.name_en} - {t('academic.subjects.semester')} {prereq.semester_number}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {corequisites.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('subjectsForm.corequisites')}</h4>
                    <div className="space-y-2">
                      {corequisites.map((coreq) => (
                        <div key={coreq.id} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">
                            {coreq.code} - {coreq.name_en}
                          </p>
                          {coreq.majors?.name_en && (
                            <p className="text-xs text-gray-600 mt-1">
                              {coreq.majors.name_en} - {t('academic.subjects.semester')} {coreq.semester_number}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grade Configuration */}
          {subject?.grade_configuration && Array.isArray(subject.grade_configuration) && subject.grade_configuration.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.gradeConfiguration')}</h3>
              <div className="space-y-4">
                {subject.grade_configuration.map((config, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {config.grade_type_name_en} ({config.grade_type_code})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {config.maximum && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">{t('subjectsForm.maximum')}</p>
                          <p className="text-sm text-gray-900">{config.maximum}</p>
                        </div>
                      )}
                      {config.minimum && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">{t('subjectsForm.minimum')}</p>
                          <p className="text-sm text-gray-900">{config.minimum}</p>
                        </div>
                      )}
                      {config.pass_score && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">{t('subjectsForm.passScore')}</p>
                          <p className="text-sm text-gray-900">{config.pass_score}</p>
                        </div>
                      )}
                      {config.fail_score && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">{t('subjectsForm.failScore')}</p>
                          <p className="text-sm text-gray-900">{config.fail_score}</p>
                        </div>
                      )}
                      {config.weight && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">{t('subjectsForm.weight')}</p>
                          <p className="text-sm text-gray-900">{config.weight}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Syllabus */}
          {(subject?.syllabus_content || subject?.syllabus_content_ar) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.syllabus') || 'Syllabus / Course Plan'}</h3>
              {subject?.syllabus_content && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.name')} (English)</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{subject.syllabus_content}</p>
                </div>
              )}
              {subject?.syllabus_content_ar && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.nameAr')} (Arabic)</p>
                  <p className="text-gray-700 whitespace-pre-wrap" dir="rtl">{subject.syllabus_content_ar}</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Rules */}
          {(subject?.attendance_rules || subject?.attendance_method) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.attendanceRules') || 'Attendance Rules'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.attendanceMethod') || 'Attendance Method'}</p>
                  <p className="text-gray-900">
                    {subject?.attendance_rules?.method === 'AT_AUTO' 
                      ? (t('subjectsForm.attendanceAuto') || 'Automatic Attendance (Online)')
                      : (t('subjectsForm.attendanceManual') || 'Manual Attendance')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.allowExcusedAbsence') || 'Allow Excused Absences'}</p>
                  <p className="text-gray-900">
                    {subject?.attendance_rules?.allow_excused !== false ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                  </p>
                </div>
                {subject?.attendance_rules?.max_absences && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.maxAbsences') || 'Maximum Allowed Absences'}</p>
                    <p className="text-gray-900">{subject.attendance_rules.max_absences}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grades Visibility */}
          {subject?.grades_visibility_status && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.gradesVisibility') || 'Grades Visibility'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.gradesVisibilityStatus') || 'Visibility Status'}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    subject.grades_visibility_status === 'GV_HID' ? 'bg-gray-100 text-gray-800' :
                    subject.grades_visibility_status === 'GV_REL' ? 'bg-green-100 text-green-800' :
                    subject.grades_visibility_status === 'GV_FIN' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {subject.grades_visibility_status === 'GV_HID' ? (t('subjectsForm.gradesHidden') || 'Hidden') :
                     subject.grades_visibility_status === 'GV_TMP' ? (t('subjectsForm.gradesVisibleTemp') || 'Visible Temporarily') :
                     subject.grades_visibility_status === 'GV_REL' ? (t('subjectsForm.gradesReleased') || 'Released') :
                     (t('subjectsForm.gradesFinalLocked') || 'Final Locked')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Descriptions */}
          {(subject?.description || subject?.description_ar) && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subjectsForm.description')}</h3>
              {subject?.description && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.name')} (English)</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{subject.description}</p>
                </div>
              )}
              {subject?.description_ar && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">{t('subjectsForm.nameAr')}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{subject.description_ar}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

