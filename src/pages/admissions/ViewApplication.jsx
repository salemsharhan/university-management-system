import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, CheckCircle, XCircle, Clock, Mail, Phone, MapPin, Calendar, GraduationCap, FileText, User, AlertCircle, BookOpen, Edit, Save, X, ChevronDown, ChevronUp, ArrowRight, Info, Sparkles, Shield, TrendingUp, ArrowDown } from 'lucide-react'

export default function ViewApplication() {
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user } = useAuth()
  
  // Parse ID as integer to avoid UUID parsing issues
  const applicationId = idParam ? parseInt(idParam, 10) : null
  
  const [loading, setLoading] = useState(true)
  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // Status management state
  const [statusCodes, setStatusCodes] = useState([])
  const [statusTransitions, setStatusTransitions] = useState([])
  const [requestReasons, setRequestReasons] = useState([])
  const [rejectReasons, setRejectReasons] = useState([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedReason, setSelectedReason] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [modalStep, setModalStep] = useState(1) // 1: Select Status, 2: Select Reason (if needed), 3: Add Notes
  const [showAllStatuses, setShowAllStatuses] = useState(false)
  
  // Activity timeline state
  const [activityLog, setActivityLog] = useState([])
  const [loadingActivity, setLoadingActivity] = useState(false)

  useEffect(() => {
    if (applicationId) {
      fetchApplication()
      fetchStatusData()
    }
  }, [applicationId])

  const fetchStatusData = async () => {
    try {
      // Fetch all status codes
      const { data: codes, error: codesError } = await supabase
        .from('student_status_codes')
        .select('*')
        .eq('is_active', true)
        .order('code')

      if (codesError) throw codesError
      setStatusCodes(codes || [])

      // Fetch status transitions
      const { data: transitions, error: transitionsError } = await supabase
        .from('status_workflow_transitions')
        .select('*')
        .eq('is_active', true)
        .order('from_status_code')

      if (transitionsError) throw transitionsError
      setStatusTransitions(transitions || [])

      // Fetch request info reasons (RVRI)
      const { data: requestReasonsData, error: requestError } = await supabase
        .from('status_transition_reasons')
        .select('*')
        .eq('reason_type', 'request_info')
        .eq('is_active', true)
        .order('code')

      if (requestError) throw requestError
      setRequestReasons(requestReasonsData || [])

      // Fetch reject reasons (DCRJ)
      const { data: rejectReasonsData, error: rejectError } = await supabase
        .from('status_transition_reasons')
        .select('*')
        .eq('reason_type', 'reject')
        .eq('is_active', true)
        .order('code')

      if (rejectError) throw rejectError
      setRejectReasons(rejectReasonsData || [])
    } catch (err) {
      console.error('Error fetching status data:', err)
    }
  }


  const fetchApplication = async () => {
    if (!applicationId || isNaN(applicationId)) {
      setError('Invalid application ID')
      setLoading(false)
      return null
    }

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
        .eq('id', applicationId)
        .single()

      if (error) throw error
      setApplication(data)
      
      // Fetch activity log after application is loaded
      if (data?.id && data?.created_at) {
        fetchActivityLogForApplication(data.id, data)
      }
      
      return data
    } catch (err) {
      console.error('Error fetching application:', err)
      setError('Failed to load application')
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityLogForApplication = async (appId, appData = null) => {
    setLoadingActivity(true)
    try {
      // Use passed appData or current application state
      const currentApp = appData || application
      
      // Fetch status change audit log entries for this application
      const { data: logEntries, error: logError } = await supabase
        .from('status_change_audit_log')
        .select('*')
        .eq('entity_type', 'application')
        .eq('entity_id', appId)
        .order('created_at', { ascending: false })

      if (logError) throw logError

      // Fetch user details for entries that have triggered_by
      const userIds = [...new Set(logEntries?.filter(entry => entry.triggered_by).map(entry => entry.triggered_by) || [])]
      let usersMap = {}
      
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, name')
          .in('id', userIds)
        
        if (!usersError && usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = user
            return acc
          }, {})
        }
      }

      // Attach user data to log entries
      const logEntriesWithUsers = (logEntries || []).map(entry => ({
        ...entry,
        triggered_by_user: entry.triggered_by ? usersMap[entry.triggered_by] || null : null
      }))

      // Also add the initial creation as an activity
      if (currentApp?.created_at) {
        const initialEntry = {
          id: 'initial',
          from_status_code: null,
          to_status_code: currentApp.status_code || 'APDR',
          trigger_code: 'TRSB',
          triggered_by: null,
          notes: 'Application created',
          created_at: currentApp.created_at,
          triggered_by_user: null,
        }
        // Check if initial entry already exists in logEntries (to avoid duplicates)
        const hasInitialEntry = logEntriesWithUsers?.some(entry => 
          entry.trigger_code === 'TRSB' && !entry.from_status_code && entry.to_status_code === (currentApp.status_code || 'APDR')
        )
        setActivityLog(hasInitialEntry ? logEntriesWithUsers : [initialEntry, ...logEntriesWithUsers])
      } else {
        setActivityLog(logEntriesWithUsers)
      }
    } catch (err) {
      console.error('Error fetching activity log:', err)
      setActivityLog([])
    } finally {
      setLoadingActivity(false)
    }
  }

  const getAvailableTransitions = () => {
    if (!application?.status_code) return []
    
    return statusTransitions.filter(
      transition => transition.from_status_code === application.status_code
    )
  }

  const getAllAvailableStatuses = () => {
    const transitions = getAvailableTransitions()
    const transitionCodes = transitions.map(t => t.to_status_code)
    
    const currentStatus = statusCodes.find(s => s.code === application?.status_code)
    if (!currentStatus) return statusCodes

    return statusCodes.map(status => ({
      ...status,
      isTransition: transitionCodes.includes(status.code),
      transition: transitions.find(t => t.to_status_code === status.code)
    }))
  }

  const getStatusesByCategory = () => {
    const allStatuses = getAllAvailableStatuses()
    const transitions = getAvailableTransitions()
    const transitionCodes = transitions.map(t => t.to_status_code)
    
    const categories = {
      recommended: allStatuses.filter(s => s.isTransition),
      application: allStatuses.filter(s => s.category === 'application' && !s.isTransition),
      review: allStatuses.filter(s => s.category === 'review' && !s.isTransition),
      decision: allStatuses.filter(s => s.category === 'decision' && !s.isTransition),
      enrollment: allStatuses.filter(s => s.category === 'enrollment' && !s.isTransition),
      academic: allStatuses.filter(s => s.category === 'academic' && !s.isTransition),
      graduation: allStatuses.filter(s => (s.category === 'graduation' || s.code === 'GRAD' || s.code === 'ALUM') && !s.isTransition),
      other: allStatuses.filter(s => !transitionCodes.includes(s.code) && !['application', 'review', 'decision', 'enrollment', 'academic', 'graduation'].includes(s.category))
    }
    
    return categories
  }

  const requiresReason = (statusCode) => {
    if (statusCode === 'RVRI') return 'request_info'
    if (statusCode === 'DCRJ') return 'reject'
    return null
  }

  const handleStatusSelect = (statusCode) => {
    setSelectedStatus(statusCode)
    setError('')
    const reasonType = requiresReason(statusCode)
    if (reasonType) {
      setModalStep(2) // Move to reason selection step
    } else {
      setModalStep(3) // Move to notes step
    }
  }

  const handleReasonSelect = (reasonCode) => {
    setSelectedReason(reasonCode)
    setError('')
    setModalStep(3) // Move to notes step
  }

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      setError('Please select a status')
      setModalStep(1)
      return
    }

    const reasonType = requiresReason(selectedStatus)
    if (reasonType && !selectedReason) {
      setError(`Please select a ${reasonType === 'request_info' ? 'request' : 'reject'} reason`)
      setModalStep(2)
      return
    }

    setUpdating(true)
    setError('')
    
    try {
      // Fetch the integer user ID from users table (not the auth UUID)
      let userId = null
      if (user?.email) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()
        
        if (!userError && userData) {
          userId = userData.id
        }
      }

      // Determine legacy status for backward compatibility
      let legacyStatus = 'pending'
      if (selectedStatus.startsWith('DC')) {
        legacyStatus = selectedStatus === 'DCRJ' ? 'rejected' : 'accepted'
      } else if (selectedStatus === 'DCWL') {
        legacyStatus = 'waitlisted'
      } else if (selectedStatus.startsWith('EN') || selectedStatus.startsWith('AC') || selectedStatus === 'GRAD' || selectedStatus === 'ALUM') {
        legacyStatus = 'accepted'
      }

      const updateData = {
        status_code: selectedStatus,
        status: legacyStatus,
        status_reason_code: selectedReason || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_notes: statusNotes || null,
        status_changed_at: new Date().toISOString(),
        status_changed_by: userId,
      }

      const { error: updateError } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (updateError) throw updateError

      // Find if there's a defined transition for this status change
      const transition = statusTransitions.find(t => 
        t.from_status_code === application?.status_code && t.to_status_code === selectedStatus
      )
      
      // Log the status change to audit log
      const { error: auditError } = await supabase
        .from('status_change_audit_log')
        .insert({
          entity_type: 'application',
          entity_id: applicationId,
          from_status_code: application?.status_code || null,
          to_status_code: selectedStatus,
          transition_reason_code: selectedReason || null,
          trigger_code: transition?.trigger_code || 'TRMN', // Use transition trigger or 'Manual' if no transition defined
          triggered_by: userId,
          notes: statusNotes || null,
        })

      if (auditError) {
        console.error('Error logging status change:', auditError)
        // Don't throw here - the application update was successful
      }
      
      setShowStatusModal(false)
      setSelectedStatus('')
      setSelectedReason('')
      setStatusNotes('')
      setModalStep(1)
      setShowAllStatuses(false)
      
      // Refresh application data (this will also trigger activity log fetch)
      await fetchApplication()
      
      // Also explicitly refetch activity log to ensure it's up to date
      // The fetchApplication above should have already triggered it, but this ensures it
      if (applicationId) {
        // Get the latest application data
        const { data: updatedApp } = await supabase
          .from('applications')
          .select('id, created_at, status_code')
          .eq('id', applicationId)
          .single()
        
        if (updatedApp) {
          fetchActivityLogForApplication(applicationId, updatedApp)
        }
      }
    } catch (err) {
      console.error('Error updating application status:', err)
      setError(err.message || 'Failed to update application status')
    } finally {
      setUpdating(false)
    }
  }

  const resetModal = () => {
    setShowStatusModal(false)
    setSelectedStatus('')
    setSelectedReason('')
    setStatusNotes('')
    setModalStep(1)
    setShowAllStatuses(false)
    setError('')
  }

  const getStatusColor = (statusCode) => {
    if (!statusCode) return 'bg-gray-100 text-gray-800 border-gray-200'
    
    const category = statusCodes.find(s => s.code === statusCode)?.category || ''
    
    if (statusCode.startsWith('AP')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (statusCode.startsWith('RV')) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (statusCode.startsWith('DC')) {
      if (statusCode === 'DCRJ') return 'bg-red-100 text-red-800 border-red-200'
      if (statusCode === 'DCWL') return 'bg-purple-100 text-purple-800 border-purple-200'
      return 'bg-green-100 text-green-800 border-green-200'
    }
    if (statusCode.startsWith('EN')) return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    if (statusCode.startsWith('AC')) return 'bg-teal-100 text-teal-800 border-teal-200'
    if (statusCode === 'GRAD') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (statusCode === 'ALUM') return 'bg-slate-100 text-slate-800 border-slate-200'
    
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (statusCode) => {
    if (!statusCode) return <Clock className="w-5 h-5" />
    
    if (statusCode === 'DCRJ') return <XCircle className="w-5 h-5" />
    if (statusCode === 'DCFA' || statusCode === 'DCCA') return <CheckCircle className="w-5 h-5" />
    if (statusCode.startsWith('EN') || statusCode.startsWith('AC') || statusCode === 'GRAD') return <CheckCircle className="w-5 h-5" />
    if (statusCode === 'DCWL') return <Clock className="w-5 h-5" />
    
    return <Clock className="w-5 h-5" />
  }

  const getStatusDisplayName = (statusCode) => {
    if (!statusCode) return 'Unknown'
    const status = statusCodes.find(s => s.code === statusCode)
    return status ? (isRTL ? status.name_ar : status.name_en) : statusCode
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

  if (!application) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admissions/applications')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          Application not found
        </div>
      </div>
    )
  }

  const availableStatuses = getAllAvailableStatuses()
  const availableTransitions = getAvailableTransitions()
  const reasonType = selectedStatus ? requiresReason(selectedStatus) : null
  const reasonsList = reasonType === 'request_info' ? requestReasons : reasonType === 'reject' ? rejectReasons : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'}`}>
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
          <button
            onClick={() => navigate('/admissions/applications')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>Application Details</h1>
            <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {application?.first_name} {application?.last_name}
            </p>
          </div>
        </div>
        <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'}`}>
          <span className={`inline-flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 rounded-lg border font-medium ${getStatusColor(application?.status_code || application?.status)}`}>
            {getStatusIcon(application?.status_code || application?.status)}
            <span>{getStatusDisplayName(application?.status_code || application?.status)}</span>
          </span>
          <button
            onClick={() => {
              setModalStep(1)
              setSelectedStatus('')
              setSelectedReason('')
              setStatusNotes('')
              setShowAllStatuses(false)
              setError('')
              setShowStatusModal(true)
            }}
            disabled={updating}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="w-4 h-4" />
            <span>Change Status</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Enhanced Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse justify-between' : 'justify-between'} p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100`}>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Change Application Status
                </h2>
                <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Select a new status for this application
                </p>
              </div>
              <button
                onClick={resetModal}
                className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${modalStep >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${modalStep >= 1 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white'}`}>
                    {modalStep > 1 ? <CheckCircle className="w-5 h-5" /> : <span>1</span>}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${isRTL ? 'mr-2 ml-0' : ''}`}>Select Status</span>
                </div>
                <ArrowRight className={`w-4 h-4 ${modalStep >= 2 ? 'text-primary-600' : 'text-gray-300'}`} />
                <div className={`flex items-center ${modalStep >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${modalStep >= 2 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white'}`}>
                    {modalStep > 2 ? <CheckCircle className="w-5 h-5" /> : <span>2</span>}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${isRTL ? 'mr-2 ml-0' : ''}`}>
                    {requiresReason(selectedStatus) ? (requiresReason(selectedStatus) === 'reject' ? 'Reject Reason' : 'Request Reason') : 'Add Notes'}
                  </span>
                </div>
                {requiresReason(selectedStatus) && (
                  <>
                    <ArrowRight className={`w-4 h-4 ${modalStep >= 3 ? 'text-primary-600' : 'text-gray-300'}`} />
                    <div className={`flex items-center ${modalStep >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${modalStep >= 3 ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 bg-white'}`}>
                        <span>3</span>
                      </div>
                      <span className={`ml-2 text-sm font-medium ${isRTL ? 'mr-2 ml-0' : ''}`}>Add Notes</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Status Selection */}
              {modalStep === 1 && (
                <div className="space-y-6">
                  {/* Current Status Display */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Current Status</label>
                        <div className={`inline-flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} px-4 py-2 rounded-lg border-2 ${getStatusColor(application?.status_code || application?.status)}`}>
                          {getStatusIcon(application?.status_code || application?.status)}
                          <span className="font-bold text-lg">{getStatusDisplayName(application?.status_code || application?.status)}</span>
                          {application?.status_code && (
                            <span className="text-xs font-mono opacity-75">({application.status_code})</span>
                          )}
                        </div>
                      </div>
                      <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>

                  {/* Recommended Transitions */}
                  {availableTransitions.length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Sparkles className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-bold text-gray-900">Recommended Next Steps</h3>
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                          {availableTransitions.length} available
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {availableTransitions.map(transition => {
                          const targetStatus = statusCodes.find(s => s.code === transition.to_status_code)
                          if (!targetStatus) return null
                          return (
                            <button
                              key={transition.id}
                              onClick={() => handleStatusSelect(targetStatus.code)}
                              className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-105 text-left ${isRTL ? 'text-right' : 'text-left'} ${getStatusColor(targetStatus.code)} hover:border-primary-500`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    {getStatusIcon(targetStatus.code)}
                                    <span className="font-bold text-sm">{targetStatus.code}</span>
                                  </div>
                                  <p className="font-semibold text-gray-900 mb-1">
                                    {isRTL ? targetStatus.name_ar : targetStatus.name_en}
                                  </p>
                                  {transition.trigger_name_en && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      {isRTL ? transition.trigger_name_ar : transition.trigger_name_en}
                                    </p>
                                  )}
                                </div>
                                <Sparkles className="w-4 h-4 text-primary-600 flex-shrink-0" />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* All Statuses (Collapsible) */}
                  <div>
                    <button
                      onClick={() => setShowAllStatuses(!showAllStatuses)}
                      className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors mb-4"
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-gray-600" />
                        <span className="font-semibold text-gray-900">
                          {showAllStatuses ? 'Hide' : 'Show'} All Available Statuses
                        </span>
                      </div>
                      {showAllStatuses ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {showAllStatuses && (
                      <div className="space-y-6">
                        {(() => {
                          const categories = getStatusesByCategory()
                          return Object.entries(categories).map(([category, statuses]) => {
                            if (statuses.length === 0 || category === 'recommended') return null
                            
                            const categoryLabels = {
                              application: { label: 'Application Statuses', icon: FileText, bgClass: 'bg-blue-50', iconClass: 'text-blue-600' },
                              review: { label: 'Review Statuses', icon: AlertCircle, bgClass: 'bg-yellow-50', iconClass: 'text-yellow-600' },
                              decision: { label: 'Decision Statuses', icon: CheckCircle, iconReject: XCircle, bgClass: 'bg-green-50', iconClass: 'text-green-600' },
                              enrollment: { label: 'Enrollment Statuses', icon: GraduationCap, bgClass: 'bg-indigo-50', iconClass: 'text-indigo-600' },
                              academic: { label: 'Academic Statuses', icon: BookOpen, bgClass: 'bg-teal-50', iconClass: 'text-teal-600' },
                              graduation: { label: 'Graduation & Alumni', icon: CheckCircle, bgClass: 'bg-emerald-50', iconClass: 'text-emerald-600' },
                              other: { label: 'Other Statuses', icon: Info, bgClass: 'bg-gray-50', iconClass: 'text-gray-600' }
                            }
                            
                            const catInfo = categoryLabels[category] || categoryLabels.other
                            const CatIcon = catInfo.icon
                            
                            return (
                              <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className={`${catInfo.bgClass} px-4 py-3 border-b border-gray-200`}>
                                  <div className="flex items-center space-x-2">
                                    <CatIcon className={`w-5 h-5 ${catInfo.iconClass}`} />
                                    <h4 className="font-semibold text-gray-900">{catInfo.label}</h4>
                                    <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
                                      {statuses.length}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                                  {statuses.map(status => (
                                    <button
                                      key={status.code}
                                      onClick={() => handleStatusSelect(status.code)}
                                      className={`p-3 rounded-lg border-2 transition-all hover:shadow-md hover:scale-[1.02] text-left ${isRTL ? 'text-right' : 'text-left'} ${getStatusColor(status.code)} hover:border-primary-400`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-1">
                                            {getStatusIcon(status.code)}
                                            <span className="font-mono text-xs font-bold">{status.code}</span>
                                          </div>
                                          <p className="text-sm font-medium">
                                            {isRTL ? status.name_ar : status.name_en}
                                          </p>
                                        </div>
                                        <ArrowRight className={`w-4 h-4 opacity-50 ${isRTL ? 'rotate-180' : ''}`} />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Reason Selection */}
              {modalStep === 2 && reasonType && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900 mb-1">
                          {reasonType === 'reject' ? 'Rejection Reason Required' : 'Additional Information Request'}
                        </p>
                        <p className="text-sm text-blue-700">
                          {reasonType === 'reject' 
                            ? 'Please select a reason for rejecting this application. This will be recorded and may be communicated to the applicant.'
                            : 'Please select the type of additional information or documents you need from the applicant.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-4">
                    {reasonType === 'reject' ? <XCircle className="w-5 h-5 text-red-600" /> : <AlertCircle className="w-5 h-5 text-yellow-600" />}
                    <h3 className="text-lg font-bold text-gray-900">
                      {reasonType === 'request_info' ? 'Request Information Reasons' : 'Rejection Reasons'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reasonsList.map(reason => (
                      <button
                        key={reason.code}
                        onClick={() => handleReasonSelect(reason.code)}
                        className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg text-left ${isRTL ? 'text-right' : 'text-left'} ${
                          selectedReason === reason.code
                            ? reasonType === 'reject' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 bg-white hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-mono text-xs font-bold text-gray-600">{reason.code}</span>
                              {selectedReason === reason.code && (
                                <CheckCircle className={`w-4 h-4 ${reasonType === 'reject' ? 'text-red-600' : 'text-yellow-600'}`} />
                              )}
                            </div>
                            <p className="font-semibold text-gray-900">
                              {isRTL ? reason.name_ar : reason.name_en}
                            </p>
                          </div>
                          <ArrowRight className={`w-4 h-4 opacity-50 ${isRTL ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Notes */}
              {modalStep === 3 && (
                <div className="space-y-6">
                  {/* Selected Status Review */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-6 border-2 border-primary-200">
                    <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Status Change Summary</label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">From:</span>
                        <span className={`px-3 py-1 rounded-lg border ${getStatusColor(application?.status_code || application?.status)} font-medium`}>
                          {getStatusDisplayName(application?.status_code || application?.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowDown className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">To:</span>
                        <span className={`px-3 py-1 rounded-lg border ${getStatusColor(selectedStatus)} font-medium`}>
                          {getStatusDisplayName(selectedStatus)}
                        </span>
                      </div>
                      {selectedReason && (
                        <div className="mt-3 pt-3 border-t border-primary-200">
                          <span className="text-sm text-gray-600">Reason:</span>
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {isRTL 
                              ? reasonsList.find(r => r.code === selectedReason)?.name_ar 
                              : reasonsList.find(r => r.code === selectedReason)?.name_en}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Additional Notes <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none"
                      placeholder="Add any additional notes, comments, or instructions about this status change..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      These notes will be saved with the status change for future reference.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-3'} justify-between p-6 border-t border-gray-200 bg-gray-50`}>
              <button
                onClick={() => {
                  if (modalStep > 1) {
                    setModalStep(prev => prev - 1)
                    setError('')
                  } else {
                    resetModal()
                  }
                }}
                disabled={updating}
                className="flex items-center space-x-2 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                <span>{modalStep > 1 ? 'Back' : 'Cancel'}</span>
              </button>
              
              {modalStep === 3 && (
                <button
                  onClick={handleStatusChange}
                  disabled={updating || !selectedStatus || (requiresReason(selectedStatus) && !selectedReason)}
                  className="flex items-center space-x-2 px-8 py-3 bg-primary-gradient text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Updating Status...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Confirm & Update Status</span>
                    </>
                  )}
                </button>
              )}
            </div>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Status Code</label>
                <p className="text-sm font-medium text-gray-900">{application?.status_code || application?.status || 'N/A'}</p>
              </div>
              {application?.status_reason_code && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Reason Code</label>
                  <p className="text-sm text-gray-900">{application.status_reason_code}</p>
                </div>
              )}
              {application?.financial_milestone_code && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Financial Milestone</label>
                  <p className="text-sm text-gray-900">{application.financial_milestone_code}</p>
                </div>
              )}
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
              {application?.status_changed_at && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Last Status Change</label>
                  <p className="text-sm text-gray-900">
                    {new Date(application.status_changed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
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

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>Application Activity Timeline</h2>
              <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                Complete history of status changes and application lifecycle
              </p>
            </div>
          </div>
          {loadingActivity && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          )}
        </div>

        {loadingActivity ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : activityLog.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activity recorded yet</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className={`absolute ${isRTL ? 'right-8' : 'left-8'} top-0 bottom-0 w-0.5 bg-gray-200`}></div>
            
            {/* Timeline Items */}
            <div className="space-y-6">
              {activityLog.map((entry, index) => {
                const fromStatus = entry.from_status_code ? statusCodes.find(s => s.code === entry.from_status_code) : null
                const toStatus = statusCodes.find(s => s.code === entry.to_status_code)
                const isLatest = index === 0
                const triggerInfo = entry.trigger_code ? {
                  TRSB: { label: 'Applicant Submitted', icon: CheckCircle, iconClass: 'text-blue-600', labelClass: 'text-blue-900' },
                  TRVF: { label: 'Auto Validation Failed', icon: XCircle, iconClass: 'text-red-600', labelClass: 'text-red-900' },
                  TRVP: { label: 'Auto Validation Passed', icon: CheckCircle, iconClass: 'text-green-600', labelClass: 'text-green-900' },
                  TRPW: { label: 'Payment Required', icon: Clock, iconClass: 'text-yellow-600', labelClass: 'text-yellow-900' },
                  TRAS: { label: 'Auto Assigned to Reviewer', icon: User, iconClass: 'text-blue-600', labelClass: 'text-blue-900' },
                  TRRQ: { label: 'Reviewer Requested Info', icon: AlertCircle, iconClass: 'text-yellow-600', labelClass: 'text-yellow-900' },
                  TRUP: { label: 'Applicant Uploaded Items', icon: FileText, iconClass: 'text-blue-600', labelClass: 'text-blue-900' },
                  TRDA: { label: 'Documents Approved', icon: CheckCircle, iconClass: 'text-green-600', labelClass: 'text-green-900' },
                  TRAC: { label: 'Accepted (Conditional)', icon: CheckCircle, iconClass: 'text-green-600', labelClass: 'text-green-900' },
                  TRAF: { label: 'Accepted (Final)', icon: CheckCircle, iconClass: 'text-green-600', labelClass: 'text-green-900' },
                  TRRJ: { label: 'Rejected', icon: XCircle, iconClass: 'text-red-600', labelClass: 'text-red-900' },
                  TRWL: { label: 'Waitlisted', icon: Clock, iconClass: 'text-purple-600', labelClass: 'text-purple-900' },
                  TRMN: { label: 'Manual Status Change', icon: Edit, iconClass: 'text-blue-600', labelClass: 'text-blue-900' },
                }[entry.trigger_code] : null
                
                const TriggerIcon = triggerInfo?.icon || Clock
                
                return (
                  <div key={entry.id || index} className={`relative flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-start ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
                    {/* Timeline Dot */}
                    <div className={`relative z-10 flex-shrink-0 ${isRTL ? 'ml-4' : 'mr-4'}`}>
                      <div className={`w-4 h-4 rounded-full border-4 border-white shadow-lg ${
                        isLatest ? 'bg-primary-600' : 'bg-gray-400'
                      }`}></div>
                      {isLatest && (
                        <div className="absolute inset-0 w-4 h-4 rounded-full bg-primary-600 animate-ping opacity-75"></div>
                      )}
                    </div>
                    
                    {/* Content Card */}
                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'} ${isLatest ? 'bg-primary-50 border-2 border-primary-200' : 'bg-gray-50 border border-gray-200'} rounded-xl p-4 transition-all hover:shadow-md`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} mb-2`}>
                            {triggerInfo && (
                              <>
                                <TriggerIcon className={`w-5 h-5 ${triggerInfo.iconClass}`} />
                                <span className={`font-semibold ${triggerInfo.labelClass}`}>
                                  {triggerInfo.label}
                                </span>
                              </>
                            )}
                            {!triggerInfo && (
                              <>
                                <Clock className="w-5 h-5 text-gray-600" />
                                <span className="font-semibold text-gray-900">Status Change</span>
                              </>
                            )}
                            {entry.trigger_code && (
                              <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded">
                                {entry.trigger_code}
                              </span>
                            )}
                          </div>
                          
                          {/* Status Transition */}
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} mb-3`}>
                            {fromStatus ? (
                              <>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(fromStatus.code)}`}>
                                  {getStatusDisplayName(fromStatus.code)}
                                </span>
                                <ArrowRight className={`w-4 h-4 text-gray-400 ${isRTL ? 'rotate-180' : ''}`} />
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">Initial Status</span>
                            )}
                            <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(entry.to_status_code)}`}>
                              {getStatusDisplayName(entry.to_status_code)}
                            </span>
                            <span className="text-xs font-mono text-gray-500">
                              ({entry.to_status_code})
                            </span>
                          </div>
                          
                          {/* Notes */}
                          {entry.notes && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <div className={`text-xs text-gray-500 ${isRTL ? 'text-left ml-4' : 'text-right mr-4'} whitespace-nowrap`}>
                          <div className="font-medium">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-gray-400">
                            {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Triggered By */}
                      {entry.triggered_by_user && (
                        <div className={`mt-3 pt-3 border-t border-gray-200 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-xs text-gray-600`}>
                          <User className="w-4 h-4" />
                          <span>Triggered by: {entry.triggered_by_user.email || entry.triggered_by_user.name || 'Unknown'}</span>
                        </div>
                      )}
                      {!entry.triggered_by_user && entry.trigger_code && (
                        <div className={`mt-3 pt-3 border-t border-gray-200 flex items-center ${isRTL ? 'flex-row-reverse space-x-reverse' : 'space-x-2'} text-xs text-gray-500 italic`}>
                          <Sparkles className="w-4 h-4" />
                          <span>System-triggered</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

