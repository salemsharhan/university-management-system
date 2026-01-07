import { useState } from 'react'
import { Search, Plus, BookOpen, Users, Clock, Award } from 'lucide-react'

const courses = [
  {
    id: 1,
    code: 'CS101',
    name: 'Introduction to Computer Science',
    major: 'Computer Science',
    credits: 3,
    enrolled: 45,
    capacity: 50,
    instructor: 'Dr. Mohammed Al-Rashid',
    semester: 'Fall 2025',
  },
  {
    id: 2,
    code: 'MATH201',
    name: 'Calculus II',
    major: 'Mathematics',
    credits: 4,
    enrolled: 38,
    capacity: 40,
    instructor: 'Dr. Fatima Al-Zahra',
    semester: 'Fall 2025',
  },
  {
    id: 3,
    code: 'PHYS150',
    name: 'General Physics',
    major: 'Physics',
    credits: 3,
    enrolled: 52,
    capacity: 60,
    instructor: 'Dr. Ahmed Hassan',
    semester: 'Fall 2025',
  },
  {
    id: 4,
    code: 'CHEM120',
    name: 'Organic Chemistry',
    major: 'Chemistry',
    credits: 4,
    enrolled: 28,
    capacity: 35,
    instructor: 'Dr. Sara Ibrahim',
    semester: 'Fall 2025',
  },
]

export default function Courses() {
  const [searchQuery, setSearchQuery] = useState('')

  const getEnrollmentPercentage = (enrolled, capacity) => {
    return Math.round((enrolled / capacity) * 100)
  }

  const getEnrollmentColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">Manage courses and class schedules</p>
        </div>
        <button className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by course code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>All Majors</option>
            <option>Computer Science</option>
            <option>Mathematics</option>
            <option>Physics</option>
            <option>Chemistry</option>
          </select>
          <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>All Semesters</option>
            <option>Fall 2025</option>
            <option>Spring 2025</option>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const enrollmentPercentage = getEnrollmentPercentage(course.enrolled, course.capacity)
          return (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-semibold text-primary-600">{course.code}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{course.name}</h3>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Major:</span>
                  <span className="font-medium text-gray-900">{course.major}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Instructor:</span>
                  <span className="font-medium text-gray-900">{course.instructor}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Semester:</span>
                  <span className="font-medium text-gray-900">{course.semester}</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Award className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{course.credits} Credits</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">3 Hours/Week</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Enrollment</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {course.enrolled}/{course.capacity}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getEnrollmentColor(enrollmentPercentage)}`}
                    style={{ width: `${enrollmentPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{enrollmentPercentage}% full</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}




