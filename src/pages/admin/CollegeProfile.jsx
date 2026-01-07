import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Building2, 
  Edit, 
  GraduationCap, 
  Users, 
  CalendarDays, 
  Calendar,
  BookOpen,
  Settings,
  TrendingUp,
  FileText,
  Mail,
  Phone,
  Globe,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react'

export default function CollegeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [college, setCollege] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Statistics
  const [stats, setStats] = useState({
    students: 0,
    instructors: 0,
    academicYears: 0,
    semesters: 0,
    departments: 0,
    majors: 0,
    subjects: 0,
    classes: 0,
  })

  // Data lists
  const [students, setStudents] = useState([])
  const [instructors, setInstructors] = useState([])
  const [academicYears, setAcademicYears] = useState([])
  const [semesters, setSemesters] = useState([])
  const [departments, setDepartments] = useState([])
  const [majors, setMajors] = useState([])
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [attendanceSessions, setAttendanceSessions] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [showSettings, setShowSettings] = useState({})

  useEffect(() => {
    if (id) {
      fetchCollege()
      fetchStatistics()
    }
  }, [id])

  useEffect(() => {
    if (college && activeTab !== 'overview') {
      fetchTabData()
    }
  }, [activeTab, college])

  const fetchCollege = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setCollege(data)
    } catch (err) {
      console.error('Error fetching college:', err)
      setError(err.message || 'Failed to load college')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      // Fetch all statistics in parallel
      const [
        studentsRes,
        instructorsRes,
        academicYearsRes,
        semestersRes,
        departmentsRes,
        majorsRes,
        subjectsRes,
        classesRes,
      ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('college_id', id),
        supabase.from('instructors').select('id', { count: 'exact', head: true }).eq('college_id', id),
        supabase.from('academic_years').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
        supabase.from('semesters').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
        supabase.from('departments').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
        supabase.from('majors').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
        supabase.from('classes').select('id', { count: 'exact', head: true }).or(`college_id.eq.${id},is_university_wide.eq.true`),
      ])

      setStats({
        students: studentsRes.count || 0,
        instructors: instructorsRes.count || 0,
        academicYears: academicYearsRes.count || 0,
        semesters: semestersRes.count || 0,
        departments: departmentsRes.count || 0,
        majors: majorsRes.count || 0,
        subjects: subjectsRes.count || 0,
        classes: classesRes.count || 0,
      })
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }

  const fetchTabData = async () => {
    try {
      switch (activeTab) {
        case 'students':
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, student_id, name_en, email, status, enrollment_date')
            .eq('college_id', id)
            .order('name_en')
            .limit(50)
          setStudents(studentsData || [])
          break

        case 'instructors':
          const { data: instructorsData } = await supabase
            .from('instructors')
            .select('id, employee_id, name_en, email, title, status, department_id, departments(name_en)')
            .eq('college_id', id)
            .order('name_en')
            .limit(50)
          setInstructors(instructorsData || [])
          break

        case 'academic-years':
          const { data: yearsData } = await supabase
            .from('academic_years')
            .select('*')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .order('start_date', { ascending: false })
            .limit(50)
          setAcademicYears(yearsData || [])
          break

        case 'semesters':
          const { data: semestersData } = await supabase
            .from('semesters')
            .select('*, academic_years(name_en, code)')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .order('start_date', { ascending: false })
            .limit(50)
          setSemesters(semestersData || [])
          break

        case 'departments':
          const { data: deptsData } = await supabase
            .from('departments')
            .select('*, faculties(name_en)')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .eq('status', 'active')
            .order('name_en')
            .limit(50)
          setDepartments(deptsData || [])
          break

        case 'majors':
          const { data: majorsData } = await supabase
            .from('majors')
            .select('*, faculties(name_en)')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .eq('status', 'active')
            .order('name_en')
            .limit(50)
          setMajors(majorsData || [])
          break

        case 'subjects':
          const { data: subjectsData } = await supabase
            .from('subjects')
            .select('*, majors(name_en, code)')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .eq('status', 'active')
            .order('code')
            .limit(50)
          setSubjects(subjectsData || [])
          break

        case 'classes':
          const { data: classesData } = await supabase
            .from('classes')
            .select('*, subjects(name_en, code), semesters(name_en)')
            .or(`college_id.eq.${id},is_university_wide.eq.true`)
            .eq('status', 'active')
            .order('code')
            .limit(50)
          setClasses(classesData || [])
          break

        case 'attendance':
          const { data: sessionsData } = await supabase
            .from('class_sessions')
            .select('id, session_date, start_time, end_time, classes(code, section, subjects(name_en)))')
            .eq('college_id', id)
            .order('session_date', { ascending: false })
            .limit(50)
          setAttendanceSessions(sessionsData || [])
          
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('id, date, status, students(name_en, student_id), classes(code, section))')
            .eq('college_id', id)
            .order('date', { ascending: false })
            .limit(50)
          setAttendanceRecords(attendanceData || [])
          break
      }
    } catch (err) {
      console.error('Error fetching tab data:', err)
    }
  }

  const toggleSettings = (key) => {
    setShowSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !college) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/colleges')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Colleges</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
          {error || 'College not found'}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'students', name: 'Students', icon: GraduationCap },
    { id: 'instructors', name: 'Instructors', icon: Users },
    { id: 'academic-years', name: 'Academic Years', icon: CalendarDays },
    { id: 'semesters', name: 'Semesters', icon: CalendarDays },
    { id: 'departments', name: 'Departments', icon: Building2 },
    { id: 'majors', name: 'Majors', icon: BookOpen },
    { id: 'subjects', name: 'Subjects', icon: BookOpen },
    { id: 'classes', name: 'Classes', icon: FileText },
    { id: 'attendance', name: 'Attendance', icon: Calendar },
    { id: 'settings', name: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/colleges')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Colleges</span>
        </button>
        <button
          onClick={() => navigate(`/admin/colleges/${id}/edit`)}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <Edit className="w-5 h-5" />
          <span>Edit College</span>
        </button>
      </div>

      {/* College Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start space-x-6">
          <div
            className="w-24 h-24 rounded-xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: college.primary_color || '#952562' }}
          >
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900">{college.name_en}</h1>
            {college.name_ar && (
              <p className="text-2xl text-gray-600 mt-1">{college.name_ar}</p>
            )}
            <div className="flex items-center space-x-4 mt-4">
              <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                Code: {college.code}
              </span>
              {college.type && (
                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  Type: {college.type}
                </span>
              )}
              {college.abbreviation && (
                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  {college.abbreviation}
                </span>
              )}
              <span
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  college.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {college.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary-gradient text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Students</p>
                      <p className="text-3xl font-bold mt-1">{stats.students}</p>
                    </div>
                    <GraduationCap className="w-10 h-10 opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Instructors</p>
                      <p className="text-3xl font-bold mt-1">{stats.instructors}</p>
                    </div>
                    <Users className="w-10 h-10 opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Academic Years</p>
                      <p className="text-3xl font-bold mt-1">{stats.academicYears}</p>
                    </div>
                    <CalendarDays className="w-10 h-10 opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Departments</p>
                      <p className="text-3xl font-bold mt-1">{stats.departments}</p>
                    </div>
                    <Building2 className="w-10 h-10 opacity-80" />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    {college.official_email && (
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">{college.official_email}</span>
                      </div>
                    )}
                    {college.phone_number && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700">{college.phone_number}</span>
                      </div>
                    )}
                    {college.website_url && (
                      <div className="flex items-center space-x-3">
                        <Globe className="w-5 h-5 text-gray-400" />
                        <a href={college.website_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          {college.website_url}
                        </a>
                      </div>
                    )}
                    {college.address_en && (
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                        <span className="text-gray-700">{college.address_en}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    {college.established_date && (
                      <div>
                        <span className="text-sm text-gray-500">Established:</span>
                        <span className="ml-2 text-gray-700">
                          {new Date(college.established_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {college.dean_name && (
                      <div>
                        <span className="text-sm text-gray-500">Dean:</span>
                        <span className="ml-2 text-gray-700">{college.dean_name}</span>
                      </div>
                    )}
                    {college.building && (
                      <div>
                        <span className="text-sm text-gray-500">Location:</span>
                        <span className="ml-2 text-gray-700">
                          {college.building}
                          {college.floor && `, Floor ${college.floor}`}
                          {college.room_number && `, Room ${college.room_number}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vision & Mission */}
              {(college.vision || college.mission) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {college.vision && (
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Vision</h3>
                      <p className="text-gray-700">{college.vision}</p>
                    </div>
                  )}
                  {college.mission && (
                    <div className="bg-green-50 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Mission</h3>
                      <p className="text-gray-700">{college.mission}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {(college.description_en || college.description_ar) && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                  {college.description_en && (
                    <p className="text-gray-700 mb-3">{college.description_en}</p>
                  )}
                  {college.description_ar && (
                    <p className="text-gray-700" dir="rtl">{college.description_ar}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Render tab content based on activeTab */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Students ({stats.students})</h3>
                <button
                  onClick={() => navigate(`/students/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Student
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div key={student.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <p className="font-semibold text-gray-900">{student.name_en}</p>
                    <p className="text-sm text-gray-600">{student.student_id}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'instructors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Instructors ({stats.instructors})</h3>
                <button
                  onClick={() => navigate(`/instructors/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Instructor
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instructors.map((instructor) => (
                  <div key={instructor.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/instructors/${instructor.id}`)}>
                    <p className="font-semibold text-gray-900">{instructor.name_en}</p>
                    <p className="text-sm text-gray-600">{instructor.employee_id}</p>
                    <p className="text-sm text-gray-600 capitalize">{instructor.title}</p>
                    <p className="text-sm text-gray-600">{instructor.departments?.name_en}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar rendering for other tabs */}
          {activeTab === 'academic-years' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Academic Years ({stats.academicYears})</h3>
                <button
                  onClick={() => navigate(`/academic/academic-years/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Academic Year
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {academicYears.map((year) => (
                  <div key={year.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/years/${year.id}`)}>
                    <p className="font-semibold text-gray-900">{year.name_en}</p>
                    <p className="text-sm text-gray-600">{year.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'semesters' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Semesters ({stats.semesters})</h3>
                <button
                  onClick={() => navigate(`/academic/semesters/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Semester
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {semesters.map((semester) => (
                  <div key={semester.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/semesters/${semester.id}`)}>
                    <p className="font-semibold text-gray-900">{semester.name_en}</p>
                    <p className="text-sm text-gray-600">{semester.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Departments ({stats.departments})</h3>
                <button
                  onClick={() => navigate(`/academic/departments/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Department
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <div key={dept.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/departments/${dept.id}`)}>
                    <p className="font-semibold text-gray-900">{dept.name_en}</p>
                    <p className="text-sm text-gray-600">{dept.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'majors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Majors ({stats.majors})</h3>
                <button
                  onClick={() => navigate(`/academic/majors/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Major
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {majors.map((major) => (
                  <div key={major.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/majors/${major.id}`)}>
                    <p className="font-semibold text-gray-900">{major.name_en}</p>
                    <p className="text-sm text-gray-600">{major.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Subjects ({stats.subjects})</h3>
                <button
                  onClick={() => navigate(`/academic/subjects/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Subject
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/subjects/${subject.id}`)}>
                    <p className="font-semibold text-gray-900">{subject.name_en}</p>
                    <p className="text-sm text-gray-600">{subject.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Classes ({stats.classes})</h3>
                <button
                  onClick={() => navigate(`/academic/classes/create?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Add Class
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((classItem) => (
                  <div key={classItem.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/academic/classes/${classItem.id}`)}>
                    <p className="font-semibold text-gray-900">{classItem.subjects?.name_en}</p>
                    <p className="text-sm text-gray-600">{classItem.code}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Attendance Management</h3>
                <button
                  onClick={() => navigate(`/attendance?collegeId=${id}`)}
                  className="px-4 py-2 bg-primary-gradient text-white rounded-lg hover:shadow-lg transition-all"
                >
                  View Full Dashboard
                </button>
              </div>

              {/* Sessions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Sessions ({attendanceSessions.length})</h4>
                <div className="space-y-2">
                  {attendanceSessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No sessions recorded yet</p>
                  ) : (
                    attendanceSessions.map((session) => (
                      <div key={session.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {session.classes?.code} - {session.classes?.subjects?.name_en}
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(session.session_date).toLocaleDateString()} • {session.start_time} - {session.end_time}
                            </p>
                          </div>
                          <button
                            onClick={() => navigate(`/attendance/take?sessionId=${session.id}&classId=${session.classes?.id}`)}
                            className="px-4 py-2 bg-primary-gradient text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                          >
                            View/Edit
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendance Records */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Recent Attendance Records ({attendanceRecords.length})</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                            No attendance records yet
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.students?.name_en || 'N/A'} ({record.students?.student_id || 'N/A'})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.classes?.code || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' :
                                record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">College Settings</h3>
              
              {['academic', 'financial', 'email', 'onboarding', 'system', 'examination'].map((settingType) => (
                <div key={settingType} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleSettings(settingType)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 capitalize">{settingType} Settings</span>
                    {showSettings[settingType] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {showSettings[settingType] && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(college[`${settingType}_settings`] || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

