import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import PaymentModal from '../../components/payment/PaymentModal'
import { 
  CheckCircle, XCircle, Clock, FileText, CreditCard, UserCheck, GraduationCap, 
  AlertCircle, Upload, Download, Calendar, Mail, Phone, Building2, BookOpen,
  ArrowLeft, Info, ExternalLink
} from 'lucide-react'

export default function ApplicationStatus() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [application, setApplication] = useState(location.state?.application || null)
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (id) {
      if (!application) {
        fetchApplication()
      } else {
        fetchActivityLog()
        setLoading(false)
      }
    }
  }, [id, application])

  const fetchApplication = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('applications')
        .select(`
          *,
          majors (
            name_en,
            code
          ),
          semesters (
            name_en,
            code
          ),
          colleges (
            name_en,
            code
          )
        `)
        .eq('id', parseInt(id))
        .single()

      if (fetchError) throw fetchError
      setApplication(data)
      fetchActivityLog(data.id)
    } catch (err) {
      console.error('Error fetching application:', err)
      setError('Failed to load application. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityLog = async (appId = null) => {
    const applicationId = appId || application?.id
    if (!applicationId) return

    setLoading(true)
    try {
      const { data: logEntries, error: logError } = await supabase
        .from('status_change_audit_log')
        .select('*')
        .eq('entity_type', 'application')
        .eq('entity_id', applicationId)
        .order('created_at', { ascending: false })

      if (logError) throw logError

      // Add initial creation entry
      if (application?.created_at) {
        const initialEntry = {
          id: 'initial',
          from_status_code: null,
          to_status_code: application.status_code || 'APDR',
          trigger_code: 'TRSB',
          triggered_by: null,
          notes: 'Application created',
          created_at: application.created_at,
        }
        setActivityLog([initialEntry, ...(logEntries || [])])
      } else {
        setActivityLog(logEntries || [])
      }
    } catch (err) {
      console.error('Error fetching activity log:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (statusCode) => {
    const statusMap = {
      'APDR': { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText, description: 'Your application is saved as a draft' },
      'APSB': { label: 'Submitted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, description: 'Your application has been submitted successfully' },
      'APIV': { label: 'Invalid', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, description: 'Your application did not meet the requirements' },
      'APPN': { label: 'Payment Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: CreditCard, description: 'Payment is required to proceed' },
      'APPC': { label: 'Payment Confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, description: 'Your payment has been confirmed' },
      'RVQU': { label: 'Review Queue', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, description: 'Your application is in the review queue' },
      'RVIN': { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, description: 'Your application is being reviewed' },
      'RVHL': { label: 'On Hold', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, description: 'Your application is on hold' },
      'RVRI': { label: 'Additional Info Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: FileText, description: 'We need additional information from you' },
      'RVRC': { label: 'Info Received', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, description: 'We have received your information' },
      'RVDV': { label: 'Documents Verification', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FileText, description: 'Your documents are being verified' },
      'RVIV': { label: 'Interview Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: UserCheck, description: 'An interview is required' },
      'RVEX': { label: 'Entrance Exam Required', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: GraduationCap, description: 'An entrance exam is required' },
      'DCPN': { label: 'Decision Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, description: 'A decision is pending' },
      'DCCA': { label: 'Accepted (Conditional)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, description: 'Congratulations! You have been conditionally accepted' },
      'DCFA': { label: 'Accepted (Final)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, description: 'Congratulations! You have been accepted' },
      'DCWL': { label: 'Waitlisted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, description: 'You have been placed on the waitlist' },
      'DCRJ': { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, description: 'Your application has been rejected' },
      'ENPN': { label: 'Enrollment Pending', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, description: 'Enrollment is pending' },
      'ENCF': { label: 'Enrollment Confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, description: 'Your enrollment has been confirmed' },
      'ENAC': { label: 'Enrolled (Active)', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, description: 'You are now an active student' },
    }
    return statusMap[statusCode] || { label: statusCode, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, description: 'Status unknown' }
  }

  const getRequiredActions = (statusCode, statusReasonCode) => {
    const actions = []

    // Payment required
    if (statusCode === 'APPN' || statusCode === 'APPC' || statusCode === 'APSB') {
      actions.push({
        type: 'payment',
        title: 'Registration Fee Payment Required',
        description: 'Please pay the registration fee to proceed with your application',
        icon: CreditCard,
        color: 'bg-yellow-50 border-yellow-200',
        buttonText: 'Pay Registration Fee',
        action: () => {
          setShowPaymentModal(true)
        }
      })
    }

    // Documents/Info required
    if (statusCode === 'RVRI') {
      actions.push({
        type: 'upload',
        title: 'Upload Required Documents',
        description: statusReasonCode ? `Required: ${statusReasonCode}` : 'Please upload the requested documents',
        icon: Upload,
        color: 'bg-purple-50 border-purple-200',
        buttonText: 'Upload Documents',
        action: () => {
          // Show upload modal or navigate to upload page
          alert('Document upload functionality will be implemented here')
        }
      })
    }

    // Interview required
    if (statusCode === 'RVIV') {
      actions.push({
        type: 'interview',
        title: 'Schedule Interview',
        description: 'An interview is required. Please schedule your interview time.',
        icon: UserCheck,
        color: 'bg-purple-50 border-purple-200',
        buttonText: 'Schedule Interview',
        action: () => {
          alert('Interview scheduling will be implemented here')
        }
      })
    }

    // Entrance exam required
    if (statusCode === 'RVEX') {
      actions.push({
        type: 'exam',
        title: 'Entrance Exam Required',
        description: 'You need to take an entrance exam. Please check the exam schedule.',
        icon: GraduationCap,
        color: 'bg-purple-50 border-purple-200',
        buttonText: 'View Exam Schedule',
        action: () => {
          alert('Exam schedule will be shown here')
        }
      })
    }

    // Accepted - Accept offer
    if (statusCode === 'DCFA' || statusCode === 'DCCA') {
      actions.push({
        type: 'accept',
        title: 'Accept Offer',
        description: 'Congratulations! Please accept the offer to proceed with enrollment.',
        icon: CheckCircle,
        color: 'bg-green-50 border-green-200',
        buttonText: 'Accept Offer',
        action: () => {
          alert('Offer acceptance will be implemented here')
        }
      })
    }

    return actions
  }

  if (loading && !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The application you are looking for does not exist.'}</p>
          <button
            onClick={() => navigate('/track')}
            className="px-6 py-3 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Back to Tracking
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(application.status_code)
  const requiredActions = getRequiredActions(application.status_code, application.status_reason_code)
  const StatusIcon = statusInfo.icon

  const handlePaymentSuccess = async (newMilestone, payment) => {
    // Refresh application data
    await fetchApplication()
    setShowPaymentModal(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        application={application}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/track')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Tracking</span>
          </button>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {application.first_name} {application.last_name}
                </h1>
                <p className="text-gray-600">Application Number: <span className="font-mono font-semibold">{application.application_number}</span></p>
              </div>
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border ${statusInfo.color}`}>
                <StatusIcon className="w-5 h-5" />
                <span className="font-semibold">{statusInfo.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Required Actions */}
        {requiredActions.length > 0 && (
          <div className="mb-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Action Required</h2>
            {requiredActions.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <div key={index} className={`bg-white rounded-xl border-2 ${action.color} p-6`}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white rounded-lg">
                      <ActionIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-gray-600 mb-4">{action.description}</p>
                      <button
                        onClick={action.action}
                        className="px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                      >
                        {action.buttonText}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Application Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Application Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Major</p>
              <p className="font-semibold text-gray-900">{application.majors?.name_en || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Semester</p>
              <p className="font-semibold text-gray-900">{application.semesters?.name_en || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">College</p>
              <p className="font-semibold text-gray-900">{application.colleges?.name_en || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="font-semibold text-gray-900">{application.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="font-semibold text-gray-900">{application.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
              <p className="font-semibold text-gray-900">{new Date(application.date_of_birth).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Application Timeline</h2>
          <div className="space-y-4">
            {activityLog.length > 0 ? (
              activityLog.map((entry, index) => {
                const isLatest = index === 0
                const entryStatusInfo = getStatusInfo(entry.to_status_code)
                const EntryIcon = entryStatusInfo.icon
                return (
                  <div key={entry.id || index} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${isLatest ? 'border-blue-500 bg-blue-50 animate-pulse' : 'border-gray-300 bg-gray-50'}`}>
                      <EntryIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1 pb-4 border-b border-gray-200 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">{entryStatusInfo.label}</p>
                        <p className="text-sm text-gray-500">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-gray-500 text-center py-8">No activity recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

