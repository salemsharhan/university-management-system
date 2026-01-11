import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  ArrowLeft, BookOpen, FileText, Video, Upload, Plus, Edit, Trash2,
  CheckCircle, XCircle, Clock, AlertCircle, GraduationCap, Eye, 
  MessageSquare, HelpCircle, Calendar, BarChart3, Users, Settings,
  FileVideo, File, Link as LinkIcon, Play, Download, FolderOpen, Users2
} from 'lucide-react'
import TeamsMeetingManager from '../../components/teams/TeamsMeetingManager'

export default function InstructorSubjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState(null)
  const [instructor, setInstructor] = useState(null)
  const [materials, setMaterials] = useState([])
  const [homework, setHomework] = useState([])
  const [exams, setExams] = useState([])
  const [recordings, setRecordings] = useState([])
  const [classes, setClasses] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [forumPosts, setForumPosts] = useState([])
  const [questions, setQuestions] = useState([])
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [error, setError] = useState('')

  // Update active tab when query parameter changes
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (user?.email && id) {
      fetchAllData()
    }
  }, [user, id])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Fetch instructor
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructors')
        .select('id, name_en, email, college_id')
        .eq('email', user.email)
        .eq('status', 'active')
        .single()

      if (instructorError) throw instructorError
      setInstructor(instructorData)

      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select(`
          *,
          majors(id, name_en, code),
          instructors(id, name_en, email),
          colleges(id, name_en, code)
        `)
        .eq('id', id)
        .single()

      if (subjectError) throw subjectError

      // Parse JSONB fields
      if (subjectData.attendance_rules && typeof subjectData.attendance_rules === 'string') {
        try {
          subjectData.attendance_rules = JSON.parse(subjectData.attendance_rules)
        } catch (e) {}
      }
      if (subjectData.grade_configuration && typeof subjectData.grade_configuration === 'string') {
        try {
          subjectData.grade_configuration = JSON.parse(subjectData.grade_configuration)
        } catch (e) {}
      }

      setSubject(subjectData)

      // First, fetch classes for this subject where instructor is assigned (class-wise, not subject-wise)
      const { data: instructorClasses, error: classesError } = await supabase
        .from('classes')
        .select('id, code, section')
        .eq('subject_id', id)
        .eq('instructor_id', instructorData.id)
        .eq('status', 'active')

      if (classesError) throw classesError

      // If instructor has no classes for this subject, show error
      if (!instructorClasses || instructorClasses.length === 0) {
        setError('You are not assigned to teach any classes for this subject')
        setLoading(false)
        return
      }

      const instructorClassIds = instructorClasses.map(cls => cls.id)

      // Fetch all related data filtered by instructor's classes
      await Promise.all([
        fetchMaterials(),
        fetchHomework(instructorClassIds),
        fetchExams(instructorClassIds),
        fetchRecordings(),
        fetchClasses(instructorData.id),
        fetchForumPosts(),
        fetchQuestions(),
      ])
    } catch (err) {
      console.error('Error fetching data:', err)
      setError(err.message || 'Failed to load subject data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_materials')
        .select('*, subject_content_types(code, name_en, name_ar, icon)')
        .eq('subject_id', id)
        .order('display_order')

      if (error) throw error
      setMaterials(data || [])
    } catch (err) {
      console.error('Error fetching materials:', err)
    }
  }

  const fetchHomework = async (instructorClassIds) => {
    try {
      // Only fetch homework for classes where the instructor is assigned
      // Instructors should only see homework for their classes, not all classes for the subject
      if (!instructorClassIds || instructorClassIds.length === 0) {
        setHomework([])
        return
      }

      const { data, error } = await supabase
        .from('subject_homework')
        .select('*')
        .eq('subject_id', id)
        .in('class_id', instructorClassIds) // Only show homework for instructor's classes
        .order('due_date', { ascending: false })

      if (error) throw error
      setHomework(data || [])

      // Fetch submission counts for each homework
      if (data && data.length > 0) {
        const homeworkIds = data.map(hw => hw.id)
        const { data: submissions } = await supabase
          .from('homework_submissions')
          .select('homework_id, status')
          .in('homework_id', homeworkIds)

        const homeworkWithStats = data.map(hw => ({
          ...hw,
          submissionCount: submissions?.filter(s => s.homework_id === hw.id).length || 0,
          gradedCount: submissions?.filter(s => s.homework_id === hw.id && s.status === 'HW_GRD').length || 0,
        }))
        setHomework(homeworkWithStats)
      }
    } catch (err) {
      console.error('Error fetching homework:', err)
    }
  }

  const fetchExams = async (instructorClassIds) => {
    try {
      // Only fetch exams for classes where the instructor is assigned
      // Instructors should only see exams for their classes, not all classes for the subject
      if (!instructorClassIds || instructorClassIds.length === 0) {
        setExams([])
        return
      }

      const { data, error } = await supabase
        .from('subject_exams')
        .select('*')
        .eq('subject_id', id)
        .in('class_id', instructorClassIds) // Only show exams for instructor's classes
        .order('scheduled_date', { ascending: false })

      if (error) throw error
      setExams(data || [])

      // Fetch submission counts
      if (data && data.length > 0) {
        const examIds = data.map(exam => exam.id)
        const { data: submissions } = await supabase
          .from('exam_submissions')
          .select('exam_id, status')
          .in('exam_id', examIds)

        const examsWithStats = data.map(exam => ({
          ...exam,
          submissionCount: submissions?.filter(s => s.exam_id === exam.id).length || 0,
          gradedCount: submissions?.filter(s => s.exam_id === exam.id && s.status === 'EX_GRD').length || 0,
        }))
        setExams(examsWithStats)
      }
    } catch (err) {
      console.error('Error fetching exams:', err)
    }
  }

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_recordings')
        .select('*')
        .eq('subject_id', id)
        .order('recorded_date', { ascending: false })

      if (error) throw error
      setRecordings(data || [])
    } catch (err) {
      console.error('Error fetching recordings:', err)
    }
  }

  const fetchClasses = async (instructorId) => {
    try {
      // Only fetch classes where the instructor is assigned (class-wise assignment)
      // This shows all classes for this subject where the instructor is the teacher
      if (!instructorId) {
        setClasses([])
        return
      }

      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          enrollments(id, student_id, status),
          semesters(id, name_en, code)
        `)
        .eq('subject_id', id)
        .eq('instructor_id', instructorId) // Only show classes where instructor is assigned
        .eq('status', 'active')

      if (error) throw error
      setClasses(data || [])
      
      // Calculate enrollment counts
      const classesWithCounts = data.map(cls => ({
        ...cls,
        enrollmentCount: cls.enrollments?.filter(e => e.status === 'enrolled').length || 0,
      }))
      setClasses(classesWithCounts)
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchForumPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_forum_posts')
        .select('*, posted_by_student_id, posted_by_instructor_id')
        .eq('subject_id', id)
        .is('parent_post_id', null)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setForumPosts(data || [])
    } catch (err) {
      console.error('Error fetching forum posts:', err)
    }
  }

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_questions')
        .select('*, asked_by_student_id, answered_by_instructor_id')
        .eq('subject_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setQuestions(data || [])
    } catch (err) {
      console.error('Error fetching questions:', err)
    }
  }

  const fetchAttendance = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          students(id, name_en, student_id),
          class_sessions(id, session_date, start_time, end_time)
        `)
        .eq('class_id', classId)
        .order('date', { ascending: false })
        .limit(100)

      if (error) throw error
      setAttendance(data || [])
    } catch (err) {
      console.error('Error fetching attendance:', err)
    }
  }

  const getContentTypeIcon = (typeCode) => {
    switch (typeCode) {
      case 'CT_PDF': return <FileText className="w-5 h-5" />
      case 'CT_VID': return <Video className="w-5 h-5" />
      case 'CT_PPT': return <File className="w-5 h-5" />
      case 'CT_AUD': return <FileVideo className="w-5 h-5" />
      case 'CT_LNK': return <LinkIcon className="w-5 h-5" />
      case 'CT_REC': return <Video className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  const getHomeworkStatus = (hw) => {
    const statusMap = {
      'HW_DRF': { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      'HW_PUB': { label: 'Published', color: 'bg-green-100 text-green-800' },
      'HW_CLD': { label: 'Closed', color: 'bg-red-100 text-red-800' },
    }
    return statusMap[hw.status] || { label: hw.status, color: 'bg-gray-100 text-gray-800' }
  }

  const getExamStatus = (exam) => {
    const statusMap = {
      'EX_DRF': { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      'EX_SCH': { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' },
      'EX_OPN': { label: 'Open', color: 'bg-blue-100 text-blue-800' },
      'EX_CLS': { label: 'Closed', color: 'bg-red-100 text-red-800' },
      'EX_GRD': { label: 'Graded', color: 'bg-green-100 text-green-800' },
      'EX_REL': { label: 'Results Released', color: 'bg-purple-100 text-purple-800' },
    }
    return statusMap[exam.status] || { label: exam.status, color: 'bg-gray-100 text-gray-800' }
  }

  const handlePublishHomework = async (homeworkId, publish = true) => {
    try {
      const { error } = await supabase
        .from('subject_homework')
        .update({
          status: publish ? 'HW_PUB' : 'HW_DRF',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', homeworkId)

      if (error) throw error
      fetchHomework()
    } catch (err) {
      console.error('Error publishing homework:', err)
      alert('Failed to update homework status')
    }
  }

  const handleCloseHomework = async (homeworkId) => {
    try {
      const { error } = await supabase
        .from('subject_homework')
        .update({
          status: 'HW_CLD',
          closed_at: new Date().toISOString(),
        })
        .eq('id', homeworkId)

      if (error) throw error
      fetchHomework()
    } catch (err) {
      console.error('Error closing homework:', err)
      alert('Failed to close homework')
    }
  }

  const handlePublishExam = async (examId, status) => {
    try {
      const updateData = {
        status,
        published_at: status === 'EX_SCH' ? new Date().toISOString() : null,
        opened_at: status === 'EX_OPN' ? new Date().toISOString() : null,
        closed_at: status === 'EX_CLS' ? new Date().toISOString() : null,
      }

      const { error } = await supabase
        .from('subject_exams')
        .update(updateData)
        .eq('id', examId)

      if (error) throw error
      fetchExams()
    } catch (err) {
      console.error('Error updating exam status:', err)
      alert('Failed to update exam status')
    }
  }

  const handleReleaseExamResults = async (examId) => {
    try {
      const { error } = await supabase
        .from('subject_exams')
        .update({
          status: 'EX_REL',
          results_released_at: new Date().toISOString(),
        })
        .eq('id', examId)

      if (error) throw error
      fetchExams()
    } catch (err) {
      console.error('Error releasing exam results:', err)
      alert('Failed to release exam results')
    }
  }

  const handleDeleteMaterial = async (materialId) => {
    if (!confirm('Are you sure you want to delete this material?')) return

    try {
      const { error } = await supabase
        .from('subject_materials')
        .delete()
        .eq('id', materialId)

      if (error) throw error
      fetchMaterials()
    } catch (err) {
      console.error('Error deleting material:', err)
      alert('Failed to delete material')
    }
  }

  const handleDeleteHomework = async (homeworkId) => {
    if (!confirm('Are you sure you want to delete this homework? All submissions will be deleted.')) return

    try {
      const { error } = await supabase
        .from('subject_homework')
        .delete()
        .eq('id', homeworkId)

      if (error) throw error
      fetchHomework()
    } catch (err) {
      console.error('Error deleting homework:', err)
      alert('Failed to delete homework')
    }
  }

  const handleDeleteExam = async (examId) => {
    if (!confirm('Are you sure you want to delete this exam? All submissions will be deleted.')) return

    try {
      const { error } = await supabase
        .from('subject_exams')
        .delete()
        .eq('id', examId)

      if (error) throw error
      fetchExams()
    } catch (err) {
      console.error('Error deleting exam:', err)
      alert('Failed to delete exam')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
            <p className="text-red-700">{error || 'Subject not found or you are not assigned to teach any classes for this subject'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{subject.name_en}</h1>
                <p className="text-gray-600">{subject.code} - {subject.majors?.name_en}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/academic/subjects/${id}/edit`)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Subject</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex space-x-1 border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'classes', label: 'Classes', icon: Users },
              { id: 'teams', label: 'Teams Meetings', icon: Video },
              { id: 'materials', label: 'Materials', icon: FolderOpen },
              { id: 'homework', label: 'Homework', icon: FileText },
              { id: 'exams', label: 'Exams', icon: GraduationCap },
              { id: 'recordings', label: 'Recordings', icon: Video },
              { id: 'attendance', label: 'Attendance', icon: Calendar },
              { id: 'grades', label: 'Grades', icon: BarChart3 },
              { id: 'forum', label: 'Forum', icon: MessageSquare },
              { id: 'qa', label: 'Q&A', icon: HelpCircle },
            ].map(tab => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    if (tab.id === 'attendance' && classes.length > 0) {
                      fetchAttendance(classes[0].id)
                    }
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {classes.reduce((sum, cls) => sum + (cls.enrollmentCount || 0), 0)}
                    </p>
                  </div>
                  <Users className="w-10 h-10 text-blue-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Classes</p>
                    <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                  </div>
                  <BookOpen className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Grading</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {homework.reduce((sum, hw) => sum + (hw.submissionCount - hw.gradedCount || 0), 0) +
                       exams.reduce((sum, exam) => sum + (exam.submissionCount - exam.gradedCount || 0), 0)}
                    </p>
                  </div>
                  <FileText className="w-10 h-10 text-yellow-500" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Subject Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Credit Hours</p>
                  <p className="font-semibold text-gray-900">{subject.credit_hours}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{subject.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Semester</p>
                  <p className="font-semibold text-gray-900">Semester {subject.semester_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">College</p>
                  <p className="font-semibold text-gray-900">{subject.colleges?.name_en}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Classes</h2>
                <button
                  onClick={() => navigate(`/academic/classes/create?subjectId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Class</span>
                </button>
              </div>
              {classes.length > 0 ? (
                <div className="space-y-3">
                  {classes.map(cls => (
                    <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{cls.code} - Section {cls.section}</h3>
                          <p className="text-sm text-gray-600">
                            {cls.enrollmentCount || 0} students enrolled
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              navigate(`/academic/classes/${cls.id}`)
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              fetchAttendance(cls.id)
                              setActiveTab('attendance')
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Take Attendance
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No classes created yet</p>
              )}
            </div>
          </div>
        )}

        {/* Teams Meetings Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {classes.length > 0 ? (
              classes.map(cls => (
                <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{cls.code} - Section {cls.section}</h3>
                  <TeamsMeetingManager
                    classId={cls.id}
                    subjectId={id}
                    instructorId={instructor?.id}
                    instructorEmail={instructor?.email}
                  />
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center py-8">
                <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">No classes found. Please create a class first to manage Teams meetings.</p>
              </div>
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Learning Materials</h2>
                <button
                  onClick={() => {
                    // TODO: Open add material modal
                    navigate(`/instructor/subjects/${id}/materials/create`)
                  }}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Material</span>
                </button>
              </div>
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.map(material => (
                    <div key={material.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getContentTypeIcon(material.content_type_code)}
                        <div>
                          <p className="font-medium text-gray-900">{material.title}</p>
                          <p className="text-sm text-gray-600">
                            {material.subject_content_types?.name_en || material.content_type_code}
                            {!material.is_published && ' (Draft)'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            // TODO: Open edit material modal
                            navigate(`/instructor/subjects/${id}/materials/${material.id}/edit`)
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No materials added yet</p>
              )}
            </div>
          </div>
        )}

        {/* Homework Tab */}
        {activeTab === 'homework' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Homework Assignments</h2>
                <button
                  onClick={() => {
                    navigate(`/instructor/subjects/${id}/homework/create`)
                  }}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Homework</span>
                </button>
              </div>
              {homework.length > 0 ? (
                <div className="space-y-4">
                  {homework.map(hw => {
                    const status = getHomeworkStatus(hw)
                    return (
                      <div key={hw.id} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{hw.title}</h3>
                            <p className="text-gray-600 mb-3">{hw.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>
                              <span>{hw.total_points} points</span>
                              <span>{hw.submissionCount || 0} submissions</span>
                              <span>{hw.gradedCount || 0} graded</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              navigate(`/instructor/subjects/${id}/homework/${hw.id}/submissions`)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Submissions ({hw.submissionCount || 0})
                          </button>
                          {hw.status === 'HW_DRF' && (
                            <button
                              onClick={() => handlePublishHomework(hw.id, true)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Publish
                            </button>
                          )}
                          {hw.status === 'HW_PUB' && (
                            <button
                              onClick={() => handleCloseHomework(hw.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Close
                            </button>
                          )}
                          <button
                            onClick={() => {
                              navigate(`/instructor/subjects/${id}/homework/${hw.id}/edit`)
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteHomework(hw.id)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No homework assignments yet</p>
              )}
            </div>
          </div>
        )}

        {/* Exams Tab */}
        {activeTab === 'exams' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Exams</h2>
                <button
                  onClick={() => {
                    navigate(`/instructor/subjects/${id}/exams/create`)
                  }}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Exam</span>
                </button>
              </div>
              {exams.length > 0 ? (
                <div className="space-y-4">
                  {exams.map(exam => {
                    const status = getExamStatus(exam)
                    return (
                      <div key={exam.id} className="border border-gray-200 rounded-lg p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{exam.title}</h3>
                            <p className="text-gray-600 mb-3">{exam.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{new Date(exam.scheduled_date).toLocaleDateString()}</span>
                              <span>{exam.start_time} - {exam.end_time}</span>
                              <span>{exam.total_points} points</span>
                              <span>{exam.submissionCount || 0} submissions</span>
                              <span>{exam.gradedCount || 0} graded</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              navigate(`/instructor/subjects/${id}/exams/${exam.id}/submissions`)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Submissions ({exam.submissionCount || 0})
                          </button>
                          {exam.status === 'EX_DRF' && (
                            <button
                              onClick={() => handlePublishExam(exam.id, 'EX_SCH')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Schedule
                            </button>
                          )}
                          {exam.status === 'EX_SCH' && (
                            <button
                              onClick={() => handlePublishExam(exam.id, 'EX_OPN')}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Open Exam
                            </button>
                          )}
                          {exam.status === 'EX_OPN' && (
                            <>
                              <button
                                onClick={() => handlePublishExam(exam.id, 'EX_CLS')}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Close Exam
                              </button>
                              <button
                                onClick={() => handleReleaseExamResults(exam.id)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                Release Results
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              navigate(`/instructor/subjects/${id}/exams/${exam.id}/edit`)
                            }}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No exams created yet</p>
              )}
            </div>
          </div>
        )}

        {/* Recordings Tab */}
        {activeTab === 'recordings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recorded Lectures</h2>
                <button
                  onClick={() => {
                    navigate(`/instructor/subjects/${id}/recordings/create`)
                  }}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Recording</span>
                </button>
              </div>
              {recordings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recordings.map(recording => (
                    <div key={recording.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        <Video className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{recording.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{new Date(recording.recorded_date).toLocaleDateString()}</p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            navigate(`/instructor/subjects/${id}/recordings/${recording.id}/edit`)
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this recording?')) {
                              supabase.from('subject_recordings').delete().eq('id', recording.id).then(() => fetchRecordings())
                            }
                          }}
                          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recordings uploaded yet</p>
              )}
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Management</h2>
              {classes.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          fetchAttendance(parseInt(e.target.value))
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a class...</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.code} - Section {cls.section} ({cls.enrollmentCount || 0} students)
                        </option>
                      ))}
                    </select>
                  </div>

                  {attendance.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Attendance Records</h3>
                      <div className="space-y-2">
                        {attendance.slice(0, 20).map(record => {
                          const statusIcons = {
                            present: <CheckCircle className="w-5 h-5 text-green-600" />,
                            absent: <XCircle className="w-5 h-5 text-red-600" />,
                            late: <Clock className="w-5 h-5 text-yellow-600" />,
                            excused: <AlertCircle className="w-5 h-5 text-blue-600" />,
                          }
                          return (
                            <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                              <div className="flex items-center space-x-4">
                                {statusIcons[record.status] || <XCircle className="w-5 h-5 text-gray-600" />}
                                <div>
                                  <p className="font-medium text-gray-900">{record.students?.name_en || 'Unknown'}</p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(record.date).toLocaleDateString()} - {record.status}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  // TODO: Open edit attendance modal
                                  alert('Edit attendance functionality will be implemented')
                                }}
                                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                              >
                                Edit
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {attendance.length === 0 && (
                    <p className="text-gray-500 text-center py-8">Select a class to view attendance records</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No classes available. Create a class first.</p>
              )}
            </div>
          </div>
        )}

        {/* Grades Tab */}
        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Grades Management</h2>
                <button
                  onClick={() => {
                    navigate(`/instructor/subjects/${id}/grades/upload`)
                  }}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Grades</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Grade Configuration</h3>
                  {subject.grade_configuration && Array.isArray(subject.grade_configuration) && subject.grade_configuration.length > 0 ? (
                    <div className="space-y-3">
                      {subject.grade_configuration.map((config, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {config.grade_type_name_en} ({config.grade_type_code})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Max:</span> {config.maximum || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-600">Min:</span> {config.minimum || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-600">Pass:</span> {config.pass_score || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-600">Fail:</span> {config.fail_score || 'N/A'}
                            </div>
                            <div>
                              <span className="text-gray-600">Weight:</span> {config.weight ? `${config.weight}%` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No grade configuration set. Edit subject to configure grades.</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Grading</h3>
                  <div className="space-y-2">
                    {homework.filter(hw => hw.submissionCount > hw.gradedCount).length > 0 && (
                      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-1">Homework</p>
                        {homework
                          .filter(hw => hw.submissionCount > hw.gradedCount)
                          .map(hw => (
                            <button
                              key={hw.id}
                              onClick={() => navigate(`/instructor/subjects/${id}/homework/${hw.id}/submissions`)}
                              className="block w-full text-left px-3 py-2 mt-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <span className="font-medium">{hw.title}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                ({hw.submissionCount - hw.gradedCount} pending)
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                    {exams.filter(exam => exam.submissionCount > exam.gradedCount).length > 0 && (
                      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-1">Exams</p>
                        {exams
                          .filter(exam => exam.submissionCount > exam.gradedCount)
                          .map(exam => (
                            <button
                              key={exam.id}
                              onClick={() => navigate(`/instructor/subjects/${id}/exams/${exam.id}/submissions`)}
                              className="block w-full text-left px-3 py-2 mt-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <span className="font-medium">{exam.title}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                ({exam.submissionCount - exam.gradedCount} pending)
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Forum Tab */}
        {activeTab === 'forum' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Moderate Discussion Forum</h2>
              {forumPosts.length > 0 ? (
                <div className="space-y-3">
                  {forumPosts.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{post.title || 'Untitled'}</h3>
                          <p className="text-sm text-gray-600">{new Date(post.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {post.is_pinned && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">Pinned</span>
                          )}
                          {post.is_locked && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">Locked</span>
                          )}
                          <button
                            onClick={() => {
                              // TODO: Pin/unpin, lock/unlock
                              alert('Moderation actions will be implemented')
                            }}
                            className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Moderate
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{post.content}</p>
                      {post.reply_count > 0 && (
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          View {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No forum posts yet</p>
              )}
            </div>
          </div>
        )}

        {/* Q&A Tab */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Questions & Answers</h2>
              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map(question => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-3">
                        <p className="font-semibold text-gray-900 mb-2">Q: {question.question_text}</p>
                        <p className="text-xs text-gray-500">Asked on {new Date(question.created_at).toLocaleString()}</p>
                      </div>
                      {question.answer_text ? (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="font-semibold text-gray-900 mb-2">A: {question.answer_text}</p>
                          <p className="text-xs text-gray-500">Answered on {new Date(question.answered_at).toLocaleString()}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            // TODO: Open answer modal
                            navigate(`/instructor/subjects/${id}/questions/${question.id}/answer`)
                          }}
                          className="mt-3 px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                        >
                          Answer Question
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No questions yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

