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
    send_invites: true,
    /** 'one_time' | 'recurring_weekly' */
    schedule_type: 'one_time',
    recurrence_day: 'monday',
    recurrence_end_date: '',
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
      setError(t('instructorPortal.teamsLoadFailed'))
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
        throw new Error(t('instructorPortal.teamsEmailRequired'))
      }

      // Combine date and time
      const meetingDateTime = new Date(`${formData.meeting_date}T${formData.meeting_time}`)
      const { startDateTime, endDateTime } = formatMeetingDateTime(
        meetingDateTime,
        parseInt(formData.meeting_duration_minutes)
      )

      let recurrence = undefined
      if (formData.schedule_type === 'recurring_weekly') {
        if (!formData.recurrence_end_date) {
          throw new Error(t('instructorPortal.teamsRecurrenceEndRequired'))
        }
        const startD = formData.meeting_date
        const endD = formData.recurrence_end_date
        if (new Date(endD) < new Date(startD)) {
          throw new Error(t('instructorPortal.teamsRecurrenceEndBeforeStart'))
        }
        const day = String(formData.recurrence_day || 'monday').toLowerCase()
        recurrence = {
          pattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: [day],
          },
          range: {
            type: 'endDate',
            startDate: startD,
            endDate: endD,
          },
        }
      }

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
        attendees,
        recurrence,
      })

      if (!teamsMeeting.joinUrl) {
        throw new Error('Teams meeting was created but no join URL was returned')
      }

      // Save to database
      const recurrencePatternJson =
        formData.schedule_type === 'recurring_weekly'
          ? JSON.stringify({
              type: 'weekly',
              day: formData.recurrence_day,
              endDate: formData.recurrence_end_date,
            })
          : null

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
          teams_event_id: teamsMeeting.eventId,
          is_recurring: formData.schedule_type === 'recurring_weekly',
          recurrence_pattern: recurrencePatternJson,
        })
        .select()
        .single()

      if (saveError) throw saveError

      setSuccess(t('instructorPortal.teamsSuccessCreated'))
      setShowCreateModal(false)
      setFormData({
        meeting_title: '',
        meeting_description: '',
        meeting_date: '',
        meeting_time: '',
        meeting_duration_minutes: 60,
        send_invites: true,
        schedule_type: 'one_time',
        recurrence_day: 'monday',
        recurrence_end_date: '',
      })
      fetchMeetings()
    } catch (err) {
      console.error('Error creating Teams meeting:', err)
      setError(err.message || t('instructorPortal.teamsCreateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm(t('instructorPortal.teamsDeleteConfirm'))) return

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

      setSuccess(t('instructorPortal.teamsDeleteSuccess'))
      fetchMeetings()
    } catch (err) {
      console.error('Error deleting meeting:', err)
      setError(t('instructorPortal.teamsDeleteFailed'))
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
          <h3 className="text-xl font-bold text-gray-900">{t('instructorPortal.teamsMeetingsHeader')}</h3>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading || !instructorEmail}
        >
          <Plus className="w-5 h-5" />
          <span>{t('instructorPortal.teamsCreateMeetingBtn')}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-medium">{t('instructorPortal.teamsErrorHeading')}</p>
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
            {t('instructorPortal.teamsEmailRequired')}
          </p>
        </div>
      )}

      {/* Meetings List */}
      {loading && meetings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('instructorPortal.teamsLoadingMeetings')}</div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Video className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>{t('instructorPortal.teamsEmptyTitle')}</p>
          <p className="text-sm mt-1">{t('instructorPortal.teamsEmptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2 flex flex-wrap items-center gap-2">
                    {meeting.meeting_title}
                    {meeting.is_recurring && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {t('instructorPortal.teamsRecurringBadge')}
                      </span>
                    )}
                  </h4>
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
                      <span>{t('instructorPortal.teamsJoinMeeting')}</span>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteMeeting(meeting.id)}
                  className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('instructorPortal.teamsDeleteMeetingTitle')}
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
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{t('instructorPortal.teamsModalTitle')}</h2>
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
                  {t('instructorPortal.teamsMeetingTitleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.meeting_title}
                  onChange={(e) => setFormData({ ...formData, meeting_title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('instructorPortal.teamsMeetingTitlePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('instructorPortal.teamsDescriptionLabel')}
                </label>
                <textarea
                  value={formData.meeting_description}
                  onChange={(e) => setFormData({ ...formData, meeting_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('instructorPortal.teamsDescriptionPlaceholder')}
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">{t('instructorPortal.teamsScheduleType')}</span>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule_type"
                      checked={formData.schedule_type === 'one_time'}
                      onChange={() => setFormData({ ...formData, schedule_type: 'one_time' })}
                    />
                    {t('instructorPortal.teamsOneTime')}
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule_type"
                      checked={formData.schedule_type === 'recurring_weekly'}
                      onChange={() => setFormData({ ...formData, schedule_type: 'recurring_weekly' })}
                    />
                    {t('instructorPortal.teamsRecurringWeekly')}
                  </label>
                </div>
              </div>

              {formData.schedule_type === 'recurring_weekly' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('instructorPortal.teamsRecurrenceDay')}</label>
                    <select
                      value={formData.recurrence_day}
                      onChange={(e) => setFormData({ ...formData, recurrence_day: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((d) => (
                        <option key={d} value={d}>
                          {t(`instructorPortal.weekday.${d}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('instructorPortal.teamsRecurrenceUntil')}</label>
                    <input
                      type="date"
                      value={formData.recurrence_end_date}
                      onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                      min={formData.meeting_date || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.schedule_type === 'recurring_weekly' ? t('instructorPortal.teamsFirstSessionDate') : t('instructorPortal.teamsDateLabel')}
                    {' *'}
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
                    {t('instructorPortal.teamsTimeLabel')}
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
                  {t('instructorPortal.teamsDurationLabel')}
                </label>
                <select
                  value={formData.meeting_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, meeting_duration_minutes: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="30">{t('instructorPortal.teamsDurationOpt30')}</option>
                  <option value="60">{t('instructorPortal.teamsDurationOpt60')}</option>
                  <option value="90">{t('instructorPortal.teamsDurationOpt90')}</option>
                  <option value="120">{t('instructorPortal.teamsDurationOpt120')}</option>
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
                  {t('instructorPortal.teamsSendInvitesLabel')}
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
                  {t('instructorPortal.teamsModalCancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('instructorPortal.teamsModalSubmitting') : t('instructorPortal.teamsModalSubmit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}






