import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { createTeamsMeeting, formatMeetingDateTime } from '../../utils/microsoftGraph'
import { Video, Plus, Calendar, Clock, Users, ExternalLink, Trash2, Edit, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TeamsMeetingManager({ classId, subjectId, instructorId, instructorEmail }) {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [meetings, setMeetings] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    meeting_title: '',
    meeting_description: '',
    meeting_date: '',
    meeting_time: '',
    meeting_duration_minutes: 60,
    send_invites: true
  })

  useEffect(() => {
    if (classId) {
      fetchMeetings()
    }
  }, [classId])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('class_teams_meetings')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('meeting_date', { ascending: true })

      if (fetchError) throw fetchError
      setMeetings(data || [])
    } catch (err) {
      console.error('Error fetching Teams meetings:', err)
      setError('Failed to load Teams meetings')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeeting = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (!instructorEmail) {
        throw new Error('Instructor email is required to create Teams meetings')
      }

      // Combine date and time
      const meetingDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`)
      const { startDateTime, endDateTime } = formatMeetingDateTime(
        meetingDateTime,
        parseInt(formData.meeting_duration_minutes)
      )

      // Get enrolled students for this class to send invites
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          students(id, email, first_name, last_name, name_en)
        `)
        .eq('class_id', classId)
        .eq('status', 'enrolled')

      const attendees = formData.send_invites && enrollments
        ? enrollments.map(enrollment => ({
            email: enrollment.students?.email,
            name: enrollment.students?.name_en || `${enrollment.students?.first_name} ${enrollment.students?.last_name}`,
            type: 'required'
          })).filter(a => a.email) // Filter out students without email
        : []

      // Create Teams meeting via Microsoft Graph API
      const teamsMeeting = await createTeamsMeeting({
        organizerEmail: instructorEmail,
        subject: formData.meeting_title,
        description: formData.meeting_description,
        startDateTime,
        endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        attendees
      })

      if (!teamsMeeting.joinUrl) {
        throw new Error('Teams meeting was created but no join URL was returned')
      }

      // Save to database
      const { data: savedMeeting, error: saveError } = await supabase
        .from('class_teams_meetings')
        .insert({
          class_id: classId,
          subject_id: subjectId,
          instructor_id: instructorId,
          meeting_title: formData.meeting_title,
          meeting_description: formData.meeting_description,
          meeting_date: meetingDateTime.toISOString(),
          meeting_duration_minutes: parseInt(formData.meeting_duration_minutes),
          teams_meeting_id: teamsMeeting.meetingId,
          teams_join_url: teamsMeeting.joinUrl,
          teams_organizer_email: instructorEmail,
          teams_event_id: teamsMeeting.eventId
        })
        .select()
        .single()

      if (saveError) throw saveError

      setSuccess('Teams meeting created successfully!')
      setShowCreateModal(false)
      setFormData({
        meeting_title: '',
        meeting_description: '',
        meeting_date: '',
        meeting_time: '',
        meeting_duration_minutes: 60,
        send_invites: true
      })
      fetchMeetings()
    } catch (err) {
      console.error('Error creating Teams meeting:', err)
      setError(err.message || 'Failed to create Teams meeting. Please check your Microsoft Teams configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this Teams meeting?')) return

    try {
      setLoading(true)
      const meeting = meetings.find(m => m.id === meetingId)
      
      // Deactivate in database (soft delete)
      const { error } = await supabase
        .from('class_teams_meetings')
        .update({ is_active: false })
        .eq('id', meetingId)

      if (error) throw error

      // Optionally delete from Microsoft Teams (commented out to keep meetings in Teams calendar)
      // await deleteTeamsMeeting(meeting.teams_organizer_email, meeting.teams_event_id)

      setSuccess('Meeting deleted successfully')
      fetchMeetings()
    } catch (err) {
      console.error('Error deleting meeting:', err)
      setError('Failed to delete meeting')
    } finally {
      setLoading(false)
    }
  }

  const formatMeetingDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Microsoft Teams Meetings</h3>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading || !instructorEmail}
        >
          <Plus className="w-5 h-5" />
          <span>Create Meeting</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {!instructorEmail && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 text-sm">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Instructor email is required to create Teams meetings. Please update your instructor profile.
          </p>
        </div>
      )}

      {/* Meetings List */}
      {loading && meetings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Loading meetings...</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No Teams meetings scheduled yet.</p>
          <p className="text-sm mt-1">Click "Create Meeting" to schedule a Teams meeting for this class.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">{meeting.meeting_title}</h4>
                  {meeting.meeting_description && (
                    <p className="text-sm text-gray-600 mb-3">{meeting.meeting_description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatMeetingDate(meeting.meeting_date)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{meeting.meeting_duration_minutes} minutes</span>
                    </div>
                  </div>
                  {meeting.teams_join_url && (
                    <a
                      href={meeting.teams_join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 mt-3 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Join Teams Meeting</span>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteMeeting(meeting.id)}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete meeting"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Create Teams Meeting</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setError('')
                  setSuccess('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={formData.meeting_title}
                  onChange={(e) => setFormData({ ...formData, meeting_title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Weekly Lecture - Chapter 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.meeting_description}
                  onChange={(e) => setFormData({ ...formData, meeting_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Meeting description or agenda..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.meeting_time}
                    onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes) *
                </label>
                <select
                  value={formData.meeting_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, meeting_duration_minutes: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes (2 hours)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="send_invites"
                  checked={formData.send_invites}
                  onChange={(e) => setFormData({ ...formData, send_invites: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="send_invites" className="text-sm text-gray-700">
                  Send email invites to enrolled students
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setError('')
                    setSuccess('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



