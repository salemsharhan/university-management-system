import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, CheckCircle, XCircle, Clock, Mail, Phone, MapPin, Calendar, GraduationCap, FileText, User, AlertCircle, BookOpen } from 'lucide-react'

export default function ViewApplication() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          majors (
            id,
            name_en,
            code,
            degree_level
          ),
          semesters (
            id,
            name_en,
            code
          ),
          colleges (
            id,
            name_en,
            code
          ),
          reviewed_by_user:users!applications_reviewed_by_fkey (
            id,
            email
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setApplication(data)
    } catch (err) {
      console.error('Error fetching application:', err)
      setError('Failed to load application')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus, notes = '') => {
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        })
        .eq('id', id)

      if (error) throw error
      
      await fetchApplication()
    } catch (err) {
      console.error('Error updating application status:', err)
      setError('Failed to update application status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error && !application) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'waitlisted':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5" />
      case 'rejected':
        return <XCircle className="w-5 h-5" />
      case 'pending':
        return <Clock className="w-5 h-5" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admissions/applications')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
            <p className="text-gray-600 mt-1">
              {application?.first_name} {application?.last_name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border font-medium ${getStatusColor(application?.status)}`}>
            {getStatusIcon(application?.status)}
            <span className="capitalize">{application?.status}</span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {application?.status === 'pending' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => updateStatus('accepted')}
              disabled={updating}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Accept Application</span>
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={updating}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-5 h-5" />
              <span>Reject Application</span>
            </button>
            <button
              onClick={() => updateStatus('waitlisted')}
              disabled={updating}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="w-5 h-5" />
              <span>Waitlist</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <User className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                <p className="text-gray-900 font-medium">{application?.first_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Middle Name</label>
                <p className="text-gray-900">{application?.middle_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                <p className="text-gray-900 font-medium">{application?.last_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                <p className="text-gray-900">
                  {application?.date_of_birth ? new Date(application.date_of_birth).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                <p className="text-gray-900 capitalize">{application?.gender || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nationality</label>
                <p className="text-gray-900">{application?.nationality || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Religion</label>
                <p className="text-gray-900">{application?.religion || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Place of Birth</label>
                <p className="text-gray-900">{application?.place_of_birth || 'N/A'}</p>
              </div>
              {(application?.first_name_ar || application?.last_name_ar) && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Name (Arabic)</label>
                  <p className="text-gray-900" dir="rtl">
                    {application?.first_name_ar} {application?.middle_name_ar} {application?.last_name_ar}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Phone className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{application?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-900">{application?.phone || 'N/A'}</p>
                </div>
              </div>
              {application?.street_address && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                    <p className="text-gray-900">
                      {application.street_address}
                      {application.city && `, ${application.city}`}
                      {application.state_province && `, ${application.state_province}`}
                      {application.postal_code && ` ${application.postal_code}`}
                      {application.country && `, ${application.country}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {application?.emergency_contact_name && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <AlertCircle className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contact Name</label>
                  <p className="text-gray-900">{application.emergency_contact_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Relationship</label>
                  <p className="text-gray-900">{application.emergency_contact_relationship || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                  <p className="text-gray-900">{application.emergency_contact_phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-gray-900">{application.emergency_contact_email || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Academic Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <GraduationCap className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Academic Information</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Major</label>
                <p className="text-gray-900">{application?.majors?.name_en || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Semester</label>
                <p className="text-gray-900">{application?.semesters?.name_en || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">High School</label>
                <p className="text-gray-900">{application?.high_school_name || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Graduation Year</label>
                <p className="text-gray-900">{application?.graduation_year || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">GPA</label>
                <p className="text-gray-900">{application?.gpa || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Certificate Type</label>
                <p className="text-gray-900">{application?.certificate_type || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Test Scores */}
          {(application?.toefl_score || application?.ielts_score || application?.sat_score || application?.gmat_score || application?.gre_score) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Test Scores</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {application.toefl_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">TOEFL</label>
                    <p className="text-gray-900">{application.toefl_score}/120</p>
                  </div>
                )}
                {application.ielts_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">IELTS</label>
                    <p className="text-gray-900">{application.ielts_score}/9.0</p>
                  </div>
                )}
                {application.sat_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">SAT</label>
                    <p className="text-gray-900">{application.sat_score}/1600</p>
                  </div>
                )}
                {application.gmat_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">GMAT</label>
                    <p className="text-gray-900">{application.gmat_score}/800</p>
                  </div>
                )}
                {application.gre_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">GRE</label>
                    <p className="text-gray-900">{application.gre_score}/340</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transfer Information */}
          {application?.is_transfer_student && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <BookOpen className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Transfer Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Previous University</label>
                  <p className="text-gray-900">{application.previous_university || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Previous Degree</label>
                  <p className="text-gray-900">{application.previous_degree || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Transfer Credits</label>
                  <p className="text-gray-900">{application.transfer_credits || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(application?.personal_statement || application?.scholarship_request) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <FileText className="w-5 h-5 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">Additional Information</h2>
              </div>
              {application.personal_statement && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Personal Statement</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{application.personal_statement}</p>
                </div>
              )}
              {application.scholarship_request && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Scholarship Request</label>
                  <p className="text-gray-900">
                    Yes {application.scholarship_percentage && `(${application.scholarship_percentage}%)`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Application Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Application Summary</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Application ID</label>
                <p className="text-sm font-medium text-gray-900">#{application?.id}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Submitted</label>
                <p className="text-sm text-gray-900">
                  {application?.created_at ? new Date(application.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">College</label>
                <p className="text-sm text-gray-900">{application?.colleges?.name_en || 'N/A'}</p>
              </div>
              {application?.reviewed_at && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reviewed</label>
                    <p className="text-sm text-gray-900">
                      {new Date(application.reviewed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reviewed By</label>
                    <p className="text-sm text-gray-900">
                      {application.reviewed_by_user?.email || 'N/A'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Review Notes */}
          {application?.review_notes && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.review_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



