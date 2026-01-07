import { Calendar, Clock, MapPin, Users } from 'lucide-react'

const schedule = [
  {
    day: 'Monday',
    classes: [
      { time: '08:00 - 09:30', course: 'CS101 - Introduction to Computer Science', location: 'Building A, Room 201', instructor: 'Dr. Mohammed Al-Rashid' },
      { time: '10:00 - 11:30', course: 'MATH201 - Calculus II', location: 'Building B, Room 305', instructor: 'Dr. Fatima Al-Zahra' },
    ],
  },
  {
    day: 'Tuesday',
    classes: [
      { time: '09:00 - 10:30', course: 'PHYS150 - General Physics', location: 'Building C, Room 102', instructor: 'Dr. Ahmed Hassan' },
      { time: '14:00 - 15:30', course: 'CHEM120 - Organic Chemistry', location: 'Building D, Room 205', instructor: 'Dr. Sara Ibrahim' },
    ],
  },
  {
    day: 'Wednesday',
    classes: [
      { time: '08:00 - 09:30', course: 'CS101 - Introduction to Computer Science', location: 'Building A, Room 201', instructor: 'Dr. Mohammed Al-Rashid' },
      { time: '11:00 - 12:30', course: 'MATH201 - Calculus II', location: 'Building B, Room 305', instructor: 'Dr. Fatima Al-Zahra' },
    ],
  },
  {
    day: 'Thursday',
    classes: [
      { time: '10:00 - 11:30', course: 'PHYS150 - General Physics', location: 'Building C, Room 102', instructor: 'Dr. Ahmed Hassan' },
    ],
  },
  {
    day: 'Friday',
    classes: [
      { time: '08:00 - 09:30', course: 'CHEM120 - Organic Chemistry', location: 'Building D, Room 205', instructor: 'Dr. Sara Ibrahim' },
    ],
  },
]

export default function Schedule() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Schedule</h1>
          <p className="text-gray-600 mt-1">View and manage class schedules</p>
        </div>
        <div className="flex items-center space-x-3">
          <select className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent">
            <option>Fall 2025</option>
            <option>Spring 2025</option>
          </select>
          <button className="flex items-center space-x-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
            <Calendar className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        {schedule.map((daySchedule, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-primary-gradient px-6 py-4">
              <h2 className="text-xl font-bold text-white">{daySchedule.day}</h2>
            </div>
            <div className="p-6">
              {daySchedule.classes.length > 0 ? (
                <div className="space-y-4">
                  {daySchedule.classes.map((classItem, classIndex) => (
                    <div
                      key={classIndex}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-32">
                        <div className="flex items-center space-x-2 text-primary-600">
                          <Clock className="w-4 h-4" />
                          <span className="font-semibold">{classItem.time}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{classItem.course}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{classItem.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{classItem.instructor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No classes scheduled for this day</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}




