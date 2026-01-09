import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Edit, User, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, Award, Globe, BookOpen, Languages, FileText } from 'lucide-react'

export default function ViewInstructor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [instructor, setInstructor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInstructor()
  }, [id])

  const fetchInstructor = async () => {
    try {
      const { data, error } = await supabase
        .from('instructors')
        .select('*, departments(id, name_en, code), colleges(id, name_en, code), academic_years(id, name_en, code)')
        .eq('id', id)
        .single()

      if (error) throw error
      setInstructor(data)
    } catch (err) {
      console.error('Error fetching instructor:', err)
      setError(err.message || 'Failed to load instructor')
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

  if (error && !instructor) {
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
          onClick={() => navigate(`/instructors/${id}/edit`)}
          className="flex items-center space-x-2 bg-primary-gradient text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <Edit className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-gradient rounded-lg flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{instructor?.name_en}</h1>
            {instructor?.name_ar && (
              <p className="text-lg text-gray-600 mt-1">{instructor.name_ar}</p>
            )}
            <p className="text-gray-500 mt-1">Employee ID: {instructor?.employee_id || 'N/A'}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="border-t pt-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Personal Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Date of Birth</h3>
              <p className="text-gray-900">{instructor?.date_of_birth ? new Date(instructor.date_of_birth).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Gender</h3>
              <p className="text-gray-900 capitalize">{instructor?.gender || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Nationality</h3>
              <p className="text-gray-900">{instructor?.nationality || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">National ID</h3>
              <p className="text-gray-900">{instructor?.national_id || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Passport Number</h3>
              <p className="text-gray-900">{instructor?.passport_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t pt-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>Contact Information</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
              <p className="text-gray-900">{instructor?.email || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
              <p className="text-gray-900">{instructor?.phone || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Address</h3>
              <p className="text-gray-900">{instructor?.address || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">City</h3>
              <p className="text-gray-900">{instructor?.city || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Country</h3>
              <p className="text-gray-900">{instructor?.country || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Postal Code</h3>
              <p className="text-gray-900">{instructor?.postal_code || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        {(instructor?.emergency_contact_name || instructor?.emergency_contact_phone) && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Emergency Contact</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Name</h3>
                <p className="text-gray-900">{instructor?.emergency_contact_name || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Relation</h3>
                <p className="text-gray-900">{instructor?.emergency_contact_relation || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Phone</h3>
                <p className="text-gray-900">{instructor?.emergency_contact_phone || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                <p className="text-gray-900">{instructor?.emergency_contact_email || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Academic Assignment */}
        <div className="border-t pt-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Academic Assignment</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">College</h3>
              <p className="text-gray-900">{instructor?.colleges?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Department</h3>
              <p className="text-gray-900">{instructor?.departments?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Academic Year</h3>
              <p className="text-gray-900">{instructor?.academic_years?.name_en || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Title</h3>
              <p className="text-gray-900 capitalize">{instructor?.title?.replace('_', ' ') || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Specialization</h3>
              <p className="text-gray-900">{instructor?.specialization || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Office Location</h3>
              <p className="text-gray-900">{instructor?.office_location || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Office Hours</h3>
              <p className="text-gray-900">{instructor?.office_hours || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Hire Date</h3>
              <p className="text-gray-900">{instructor?.hire_date ? new Date(instructor.hire_date).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                instructor?.status === 'active' ? 'bg-green-100 text-green-800' : 
                instructor?.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                instructor?.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {instructor?.status ? instructor.status.replace('_', ' ') : 'active'}
              </span>
            </div>
          </div>
        </div>

        {/* Education */}
        {instructor?.education && Array.isArray(instructor.education) && instructor.education.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <GraduationCap className="w-5 h-5" />
              <span>Education</span>
            </h2>
            <div className="space-y-4">
              {instructor.education.map((edu, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{edu.degree || 'N/A'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Field:</span> <span className="text-gray-900 ml-2">{edu.field || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Institution:</span> <span className="text-gray-900 ml-2">{edu.institution || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Country:</span> <span className="text-gray-900 ml-2">{edu.country || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Graduation Year:</span> <span className="text-gray-900 ml-2">{edu.graduation_year || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">GPA:</span> <span className="text-gray-900 ml-2">{edu.gpa || 'N/A'}</span>
                    </div>
                    {edu.honors && (
                      <div>
                        <span className="text-gray-500">Honors:</span> <span className="text-gray-900 ml-2">{edu.honors}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Experience */}
        {instructor?.work_experience && Array.isArray(instructor.work_experience) && instructor.work_experience.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Briefcase className="w-5 h-5" />
              <span>Work Experience</span>
            </h2>
            <div className="space-y-4">
              {instructor.work_experience.map((exp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{exp.position || 'N/A'}</h4>
                    {exp.current && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Current</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-gray-500">Organization:</span> <span className="text-gray-900 ml-2">{exp.organization || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Period:</span> <span className="text-gray-900 ml-2">
                        {exp.start_date ? new Date(exp.start_date).toLocaleDateString() : 'N/A'} - {exp.current ? 'Present' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'N/A')}
                      </span>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-gray-700 mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {instructor?.languages && Array.isArray(instructor.languages) && instructor.languages.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Languages className="w-5 h-5" />
              <span>Languages</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {instructor.languages.map((lang, index) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {lang.language || 'N/A'} {lang.proficiency && `(${lang.proficiency})`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Research Interests */}
        {instructor?.research_interests && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Research Interests</span>
            </h2>
            <p className="text-gray-900 whitespace-pre-wrap">{instructor.research_interests}</p>
          </div>
        )}

        {/* Biography */}
        {(instructor?.bio || instructor?.bio_ar) && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Biography</span>
            </h2>
            {instructor.bio && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">English</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{instructor.bio}</p>
              </div>
            )}
            {instructor.bio_ar && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Arabic</h3>
                <p className="text-gray-900 whitespace-pre-wrap" dir="rtl">{instructor.bio_ar}</p>
              </div>
            )}
          </div>
        )}

        {/* Publications */}
        {instructor?.publications && Array.isArray(instructor.publications) && instructor.publications.length > 0 && (
          <div className="border-t pt-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <BookOpen className="w-5 h-5" />
              <span>Publications</span>
            </h2>
            <div className="space-y-2">
              {instructor.publications.map((pub, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                  <p className="text-gray-900">{JSON.stringify(pub)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {instructor?.certifications && Array.isArray(instructor.certifications) && instructor.certifications.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Certifications</span>
            </h2>
            <div className="space-y-2">
              {instructor.certifications.map((cert, index) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                  <p className="text-gray-900">{JSON.stringify(cert)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



