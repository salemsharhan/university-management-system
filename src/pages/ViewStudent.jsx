import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Edit, GraduationCap } from 'lucide-react'

export default function ViewStudent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, majors(id, name_en, code), colleges(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setStudent(data)
    } catch (err) {
      console.error('Error fetching student:', err)
      setError(err.message || 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
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
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button
          onClick={() => navigate(`/students/${id}/edit`)}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {student?.first_name} {student?.middle_name} {student?.last_name}
            </h1>
            <p className="text-gray-600">{student?.student_id || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Student ID</h3>
            <p className="text-gray-900">{student?.student_id || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Date of Birth</h3>
            <p className="text-gray-900">{student?.date_of_birth || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">First Name (English)</h3>
            <p className="text-gray-900">{student?.first_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Middle Name (English)</h3>
            <p className="text-gray-900">{student?.middle_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Last Name (English)</h3>
            <p className="text-gray-900">{student?.last_name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">First Name (Arabic)</h3>
            <p className="text-gray-900">{student?.first_name_ar || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Middle Name (Arabic)</h3>
            <p className="text-gray-900">{student?.middle_name_ar || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Last Name (Arabic)</h3>
            <p className="text-gray-900">{student?.last_name_ar || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Gender</h3>
            <p className="text-gray-900">{student?.gender || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Nationality</h3>
            <p className="text-gray-900">{student?.nationality || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Religion</h3>
            <p className="text-gray-900">{student?.religion || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Marital Status</h3>
            <p className="text-gray-900">{student?.marital_status || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Blood Type</h3>
            <p className="text-gray-900">{student?.blood_type || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">International Student</h3>
            <p className="text-gray-900">{student?.is_international ? 'Yes' : 'No'}</p>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                <p className="text-gray-900">{student?.email || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
                <p className="text-gray-900">{student?.phone || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Mobile Phone</h3>
                <p className="text-gray-900">{student?.mobile_phone || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
                <p className="text-gray-900">{student?.address || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">City</h3>
                <p className="text-gray-900">{student?.city || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">State</h3>
                <p className="text-gray-900">{student?.state || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Country</h3>
                <p className="text-gray-900">{student?.country || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Postal Code</h3>
                <p className="text-gray-900">{student?.postal_code || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Name</h3>
                <p className="text-gray-900">{student?.emergency_contact_name || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Relation</h3>
                <p className="text-gray-900">{student?.emergency_contact_relation || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
                <p className="text-gray-900">{student?.emergency_phone || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                <p className="text-gray-900">{student?.emergency_contact_email || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Identity Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">National ID</h3>
                <p className="text-gray-900">{student?.national_id || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Passport Number</h3>
                <p className="text-gray-900">{student?.passport_number || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Passport Expiry</h3>
                <p className="text-gray-900">{student?.passport_expiry || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Visa Number</h3>
                <p className="text-gray-900">{student?.visa_number || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Visa Expiry</h3>
                <p className="text-gray-900">{student?.visa_expiry || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Residence Permit Number</h3>
                <p className="text-gray-900">{student?.residence_permit_number || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Residence Permit Expiry</h3>
                <p className="text-gray-900">{student?.residence_permit_expiry || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Major</h3>
                <p className="text-gray-900">{student?.majors?.name_en || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">College</h3>
                <p className="text-gray-900">{student?.colleges?.name_en || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Study Type</h3>
                <p className="text-gray-900">{student?.study_type || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Study Load</h3>
                <p className="text-gray-900">{student?.study_load || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Study Approach</h3>
                <p className="text-gray-900">{student?.study_approach || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Credit Hours</h3>
                <p className="text-gray-900">{student?.credit_hours || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Enrollment Date</h3>
                <p className="text-gray-900">{student?.enrollment_date || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  student?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {student?.status || 'active'}
                </span>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Previous Education</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">High School Name</h3>
                <p className="text-gray-900">{student?.high_school_name || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">High School Country</h3>
                <p className="text-gray-900">{student?.high_school_country || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Graduation Year</h3>
                <p className="text-gray-900">{student?.graduation_year || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">High School GPA</h3>
                <p className="text-gray-900">{student?.high_school_gpa || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Scholarship Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Has Scholarship</h3>
                <p className="text-gray-900">{student?.has_scholarship ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Scholarship Type</h3>
                <p className="text-gray-900">{student?.scholarship_type || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Scholarship Percentage</h3>
                <p className="text-gray-900">{student?.scholarship_percentage ? `${student.scholarship_percentage}%` : 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2 border-t pt-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medical Conditions</h3>
                <p className="text-gray-900">{student?.medical_conditions || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Allergies</h3>
                <p className="text-gray-900">{student?.allergies || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Medications</h3>
                <p className="text-gray-900">{student?.medications || 'N/A'}</p>
              </div>
            </div>
          </div>
          {student?.notes && (
            <div className="md:col-span-2 border-t pt-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Additional Notes</h3>
              <p className="text-gray-900">{student.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
