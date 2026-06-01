import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { getLocalizedName } from '../../utils/localizedName'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCollege } from '../../contexts/CollegeContext'
import { getNationalityFilterOptions, nationalityMatchesFilter } from '../../utils/nationalities'
import { Search, Plus, Eye, CheckCircle, XCircle, Clock, Calendar, Phone, GraduationCap, FileText, Building2 } from 'lucide-react'

function getApplicationStatusLabel(t, code) {
  const groups = ['application', 'review', 'decision', 'enrollment', 'academic', 'graduation']
  for (const g of groups) {
    const key = `admissions.statusCodes.${g}.${code}`
    const v = t(key)
    if (v && v !== key) return v
  }
  return code
}

function formatGenderFilterLabel(t, raw) {
  const v = String(raw ?? '').trim().toLowerCase()
  if (v === 'male') return t('admissions.viewApplication.detail.genderMale')
  if (v === 'female') return t('admissions.viewApplication.detail.genderFemale')
  return String(raw ?? '').trim() || raw
}

export default function Applications() {
  const { i18n } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabicLayout =
    isRTL ||
    language === 'ar' ||
    i18n?.language?.toLowerCase()?.startsWith('ar') ||
    (typeof document !== 'undefined' && document?.documentElement?.dir === 'rtl')
  const t = useCallback(
    (key, opts) => i18n.t(key, { ...opts, lng: isArabicLayout ? 'ar' : i18n.language }),
    [i18n, isArabicLayout]
  )
  const alignStart = isArabicLayout ? 'text-right' : 'text-left'
  const iconRow = isArabicLayout ? 'flex-row-reverse' : ''

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userRole, collegeId: authCollegeId, loading: authLoading } = useAuth()
  const { selectedCollegeId, loading: collegeLoading } = useCollege()
  const collegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [nationalityFilter, setNationalityFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [pendingApplicantRequestMap, setPendingApplicantRequestMap] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  })

  // Admin setting: default program for new applications (global)
  const [programDefaultsLoading, setProgramDefaultsLoading] = useState(false)
  const [programDefaultsError, setProgramDefaultsError] = useState('')
  const [programDefaultsSaved, setProgramDefaultsSaved] = useState(false)
  const [programDefaults, setProgramDefaults] = useState({
    enabled: false,
    lock_fields: true,
    college_id: '',
    major_id: '',
    semester_id: '',
    academic_year_id: '',
  })
  const [settingsMeta, setSettingsMeta] = useState({ id: null, onboarding_settings: null })
  const [settingsColleges, setSettingsColleges] = useState([])
  const [settingsMajors, setSettingsMajors] = useState([])
  const [settingsSemesters, setSettingsSemesters] = useState([])
  const [settingsAcademicYears, setSettingsAcademicYears] = useState([])

  const fetchApplications = useCallback(async () => {
    if (authLoading || userRole === null || userRole === undefined) {
      return
    }

    const effectiveCollegeId = userRole === 'admin' ? selectedCollegeId : authCollegeId

    if (userRole !== 'admin' && !authCollegeId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('applications')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          date_of_birth,
          nationality,
          gender,
          status_code,
          application_number,
          created_at,
          majors (
            name_en,
            name_ar,
            code
          ),
          semesters (
            name_en,
            name_ar,
            code
          ),
          colleges (
            name_en,
            name_ar
          )
        `)
        .order('created_at', { ascending: false })

      if (effectiveCollegeId) {
        query = query.eq('college_id', effectiveCollegeId)
      }

      const { data, error } = await query
      if (error) throw error

      setApplications(data || [])

      // Fetch open applicant requests and attach counts (used for filters/badges)
      try {
        const { data: reqs, error: rErr } = await supabase
          .from('application_applicant_requests')
          .select('application_id')
          .eq('status', 'open')
        if (!rErr) {
          const m = (reqs || []).reduce((acc, r) => {
            const k = String(r.application_id)
            acc[k] = (acc[k] || 0) + 1
            return acc
          }, {})
          setPendingApplicantRequestMap(m)
        }
      } catch {
        // ignore
      }

      const total = data?.length || 0
      const pending =
        data?.filter((a) => ['APSB', 'APPN', 'RVQU', 'RVIN', 'DCPN', 'ENPN'].includes(a.status_code)).length || 0
      const accepted =
        data?.filter((a) => ['DCFA', 'DCCA', 'ENCF', 'ENAC'].includes(a.status_code)).length || 0
      const rejected = data?.filter((a) => a.status_code === 'DCRJ').length || 0

      setStats({ total, pending, accepted, rejected })
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCollegeId, userRole, authCollegeId, authLoading])

  const fetchProgramDefaults = useCallback(async () => {
    if (userRole !== 'admin') return
    setProgramDefaultsLoading(true)
    setProgramDefaultsError('')
    try {
      const { data, error } = await supabase
        .from('university_settings')
        .select('id, onboarding_settings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error

      const raw = data?.onboarding_settings?.application_form_defaults || {}
      setSettingsMeta({ id: data?.id ?? null, onboarding_settings: data?.onboarding_settings ?? null })
      setProgramDefaults({
        enabled: Boolean(raw.enabled),
        lock_fields: raw.lock_fields !== false,
        college_id: raw.college_id != null ? String(raw.college_id) : '',
        major_id: raw.major_id != null ? String(raw.major_id) : '',
        semester_id: raw.semester_id != null ? String(raw.semester_id) : '',
        academic_year_id: raw.academic_year_id != null ? String(raw.academic_year_id) : '',
      })
    } catch (e) {
      setProgramDefaultsError(e?.message || 'Failed to load application defaults')
    } finally {
      setProgramDefaultsLoading(false)
    }
  }, [userRole])

  const fetchSettingsLists = useCallback(async () => {
    if (userRole !== 'admin') return
    try {
      const { data: colleges, error } = await supabase
        .from('colleges')
        .select('id, name_en, name_ar, code, abbreviation, status')
        .eq('status', 'active')
        .order('name_en')
      if (!error) setSettingsColleges(colleges || [])
    } catch {
      // ignore
    }
  }, [userRole])

  const fetchSettingsMajorsAndSemesters = useCallback(async (collegeIdValue) => {
    const cid = parseInt(String(collegeIdValue || ''), 10)
    if (!Number.isFinite(cid)) {
      setSettingsMajors([])
      setSettingsSemesters([])
      setSettingsAcademicYears([])
      return
    }
    try {
      const [{ data: majors }, { data: semesters }, { data: academicYears }] = await Promise.all([
        supabase
          .from('majors')
          .select('id, name_en, name_ar, code, major_status, college_id, is_university_wide')
          .or(`college_id.eq.${cid},is_university_wide.eq.true`)
          .order('name_en'),
        supabase
          .from('semesters')
          .select('id, name_en, name_ar, code, start_date, college_id, is_university_wide')
          .or(`college_id.eq.${cid},is_university_wide.eq.true`)
          .order('start_date', { ascending: false }),
        supabase
          .from('academic_years')
          .select('id, name_en, name_ar, code, start_date, end_date, status, is_current, college_id, is_university_wide')
          .or(`college_id.eq.${cid},is_university_wide.eq.true`)
          .order('start_date', { ascending: false }),
      ])
      setSettingsMajors(majors || [])
      setSettingsSemesters(semesters || [])
      setSettingsAcademicYears(academicYears || [])
    } catch {
      // ignore
    }
  }, [])

  const saveProgramDefaults = useCallback(async () => {
    if (userRole !== 'admin') return
    setProgramDefaultsLoading(true)
    setProgramDefaultsError('')
    setProgramDefaultsSaved(false)
    try {
      const currentOnboarding = settingsMeta.onboarding_settings && typeof settingsMeta.onboarding_settings === 'object'
        ? settingsMeta.onboarding_settings
        : {}
      const payload = {
        ...currentOnboarding,
        application_form_defaults: {
          enabled: Boolean(programDefaults.enabled),
          lock_fields: programDefaults.lock_fields !== false,
          college_id: programDefaults.college_id ? parseInt(programDefaults.college_id, 10) : null,
          major_id: programDefaults.major_id ? parseInt(programDefaults.major_id, 10) : null,
          semester_id: programDefaults.semester_id ? parseInt(programDefaults.semester_id, 10) : null,
          academic_year_id: programDefaults.academic_year_id ? parseInt(programDefaults.academic_year_id, 10) : null,
        },
      }

      // Ensure minimum required fields when enabled
      if (payload.application_form_defaults.enabled) {
        if (!payload.application_form_defaults.college_id || !payload.application_form_defaults.major_id) {
          throw new Error('Select at least College and Major when enabling defaults.')
        }
      }

      let res
      if (settingsMeta.id) {
        res = await supabase
          .from('university_settings')
          .update({ onboarding_settings: payload, updated_at: new Date().toISOString() })
          .eq('id', settingsMeta.id)
          .select('id, onboarding_settings')
          .limit(1)
          .maybeSingle()
      } else {
        res = await supabase
          .from('university_settings')
          .insert({ onboarding_settings: payload })
          .select('id, onboarding_settings')
          .limit(1)
          .maybeSingle()
      }
      if (res.error) throw res.error
      setSettingsMeta({ id: res.data?.id ?? settingsMeta.id ?? null, onboarding_settings: res.data?.onboarding_settings ?? payload })
      setProgramDefaultsSaved(true)
      setTimeout(() => setProgramDefaultsSaved(false), 2000)
    } catch (e) {
      setProgramDefaultsError(e?.message || 'Failed to save defaults')
    } finally {
      setProgramDefaultsLoading(false)
    }
  }, [userRole, programDefaults, settingsMeta])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useEffect(() => {
    fetchProgramDefaults()
    fetchSettingsLists()
  }, [fetchProgramDefaults, fetchSettingsLists])

  useEffect(() => {
    if (userRole !== 'admin') return
    fetchSettingsMajorsAndSemesters(programDefaults.college_id)
  }, [userRole, programDefaults.college_id, fetchSettingsMajorsAndSemesters])

  const nationalityOptions = useMemo(
    () => getNationalityFilterOptions(applications, isArabicLayout),
    [applications, isArabicLayout],
  )

  const genderOptions = useMemo(() => {
    const set = new Set()
    let hasEmpty = false
    for (const a of applications) {
      const g = String(a.gender ?? '').trim()
      if (g) set.add(g)
      else hasEmpty = true
    }
    const rank = (x) => {
      const l = x.toLowerCase()
      if (l === 'male') return 0
      if (l === 'female') return 1
      return 2
    }
    const sorted = [...set].sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra - rb
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    })
    return { values: sorted, hasEmpty }
  }, [applications])

  const filterApplications = useCallback(() => {
    let filtered = [...applications]

    if (nationalityFilter !== 'all') {
      filtered = filtered.filter((app) => nationalityMatchesFilter(app.nationality, nationalityFilter))
    }

    if (genderFilter !== 'all') {
      if (genderFilter === '__empty__') {
        filtered = filtered.filter((app) => !String(app.gender ?? '').trim())
      } else {
        filtered = filtered.filter((app) => String(app.gender ?? '').trim() === genderFilter)
      }
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter((app) =>
          ['APSB', 'APPN', 'RVQU', 'RVIN', 'DCPN', 'ENPN'].includes(app.status_code)
        )
      } else if (statusFilter === 'accepted') {
        filtered = filtered.filter((app) => ['DCFA', 'DCCA', 'ENCF', 'ENAC'].includes(app.status_code))
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter((app) => app.status_code === 'DCRJ')
      } else if (statusFilter === 'waitlisted') {
        filtered = filtered.filter((app) => app.status_code === 'DCWL')
      } else if (statusFilter === 'pending_requests') {
        filtered = filtered.filter((app) => (pendingApplicantRequestMap[String(app.id)] || 0) > 0)
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (app) =>
          app.first_name?.toLowerCase().includes(q) ||
          app.last_name?.toLowerCase().includes(q) ||
          app.email?.toLowerCase().includes(q) ||
          app.phone?.includes(q)
      )
    }

    setFilteredApplications(filtered)
  }, [applications, nationalityFilter, genderFilter, statusFilter, searchQuery, pendingApplicantRequestMap])

  useEffect(() => {
    filterApplications()
  }, [filterApplications])

  const getStatusColor = (statusCode) => {
    const statusMap = {
      APDR: 'bg-gray-100 text-gray-800 border-gray-200',
      APSB: 'bg-blue-100 text-blue-800 border-blue-200',
      APPN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPC: 'bg-green-100 text-green-800 border-green-200',
      RVQU: 'bg-blue-100 text-blue-800 border-blue-200',
      RVIN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      RVHL: 'bg-orange-100 text-orange-800 border-orange-200',
      DCPN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      DCFA: 'bg-green-100 text-green-800 border-green-200',
      DCCA: 'bg-green-100 text-green-800 border-green-200',
      DCWL: 'bg-blue-100 text-blue-800 border-blue-200',
      DCRJ: 'bg-red-100 text-red-800 border-red-200',
      ENPN: 'bg-blue-100 text-blue-800 border-blue-200',
      ENCF: 'bg-green-100 text-green-800 border-green-200',
      ENAC: 'bg-green-100 text-green-800 border-green-200',
    }
    return statusMap[statusCode] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (statusCode) => {
    if (['DCFA', 'DCCA', 'ENCF', 'ENAC', 'APPC'].includes(statusCode)) {
      return <CheckCircle className="w-4 h-4 shrink-0" />
    }
    if (statusCode === 'DCRJ') {
      return <XCircle className="w-4 h-4 shrink-0" />
    }
    return <Clock className="w-4 h-4 shrink-0" />
  }

  const majorDisplay = (majors) => {
    if (!majors) return '—'
    return getLocalizedName(majors, isArabicLayout) || majors.name_en || '—'
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (userRole !== 'admin' && !authCollegeId) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir={isArabicLayout ? 'rtl' : 'ltr'}>
        <div className={`${alignStart} max-w-md`}>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admissions.applicationsPage.collegeNotAssigned')}</h2>
          <p className="text-gray-600">{t('admissions.applicationsPage.collegeNotAssignedHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isArabicLayout ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className={`min-w-0 ${alignStart}`}>
          <h1 className="text-3xl font-bold text-gray-900">{t('admissions.applicationsPage.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admissions.applicationsPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admissions/applications/create')}
          className={`flex items-center gap-2 bg-primary-gradient text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all ${iconRow}`}
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>{t('admissions.applicationsPage.newApplication')}</span>
        </button>
      </div>

      {userRole === 'admin' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className={`flex flex-col gap-4 ${alignStart}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Default program for new applications</h2>
                <p className="text-sm text-gray-600">
                  When enabled, the applicant application form auto-fills College/Major/Semester for all new applications.
                </p>
              </div>
              <button
                type="button"
                onClick={saveProgramDefaults}
                disabled={programDefaultsLoading}
                className="shrink-0 bg-primary-gradient text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {programDefaultsLoading ? 'Saving…' : 'Save'}
              </button>
            </div>

            {(programDefaultsError || programDefaultsSaved) && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  programDefaultsError
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}
              >
                {programDefaultsError || 'Saved.'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2 md:col-span-1">
                <input
                  type="checkbox"
                  checked={Boolean(programDefaults.enabled)}
                  onChange={(e) =>
                    setProgramDefaults((p) => ({
                      ...p,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-gray-800">Enable</span>
              </label>

              <label className="flex items-center gap-2 md:col-span-1">
                <input
                  type="checkbox"
                  checked={programDefaults.lock_fields !== false}
                  onChange={(e) =>
                    setProgramDefaults((p) => ({
                      ...p,
                      lock_fields: e.target.checked,
                    }))
                  }
                />
                <span className="text-sm font-medium text-gray-800">Lock fields</span>
              </label>

              <div className="md:col-span-2 text-sm text-gray-600">
                {programDefaults.enabled
                  ? 'Applicants will see those fields pre-filled (and locked if enabled).'
                  : 'Disabled: applicants choose their college/major/semester normally.'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                <select
                  value={programDefaults.college_id}
                  onChange={(e) =>
                    setProgramDefaults((p) => ({
                      ...p,
                      college_id: e.target.value,
                      major_id: '',
                      semester_id: '',
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <option value="">Select college…</option>
                  {settingsColleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getLocalizedName(c, isArabicLayout) || c.name_en} ({c.abbreviation || c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                <select
                  value={programDefaults.major_id}
                  onChange={(e) => setProgramDefaults((p) => ({ ...p, major_id: e.target.value }))}
                  disabled={!programDefaults.college_id}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <option value="">Select major…</option>
                  {settingsMajors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {getLocalizedName(m, isArabicLayout) || m.name_en} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester (optional)</label>
                <select
                  value={programDefaults.semester_id}
                  onChange={(e) => setProgramDefaults((p) => ({ ...p, semester_id: e.target.value }))}
                  disabled={!programDefaults.college_id}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <option value="">(none)</option>
                  {settingsSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getLocalizedName(s, isArabicLayout) || s.name_en} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year (optional)</label>
                <select
                  value={programDefaults.academic_year_id}
                  onChange={(e) => setProgramDefaults((p) => ({ ...p, academic_year_id: e.target.value }))}
                  disabled={!programDefaults.college_id}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <option value="">(none)</option>
                  {settingsAcademicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {getLocalizedName(ay, isArabicLayout) || ay.name_en} ({ay.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: t('admissions.applicationsPage.statsTotal'),
            value: stats.total,
            color: 'text-gray-900',
            bg: 'bg-blue-100',
            icon: Calendar,
            iconColor: 'text-blue-600',
          },
          {
            label: t('admissions.applicationsPage.statsPending'),
            value: stats.pending,
            color: 'text-yellow-600',
            bg: 'bg-yellow-100',
            icon: Clock,
            iconColor: 'text-yellow-600',
          },
          {
            label: t('admissions.applicationsPage.statsAccepted'),
            value: stats.accepted,
            color: 'text-green-600',
            bg: 'bg-green-100',
            icon: CheckCircle,
            iconColor: 'text-green-600',
          },
          {
            label: t('admissions.applicationsPage.statsRejected'),
            value: stats.rejected,
            color: 'text-red-600',
            bg: 'bg-red-100',
            icon: XCircle,
            iconColor: 'text-red-600',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className={`flex items-center gap-3 w-full ${isArabicLayout ? 'justify-start' : 'justify-between'}`}>
              <div className={`min-w-0 flex-1 ${alignStart}`}>
                <p className="text-sm text-gray-600 mb-1">{card.label}</p>
                <p className={`text-3xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bg} rounded-lg flex items-center justify-center shrink-0`}>
                <card.icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className={`flex flex-col lg:flex-row gap-4 ${isArabicLayout ? 'lg:flex-row-reverse' : ''}`}>
          <div className="flex-1 relative min-w-0">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none ${
                isArabicLayout ? 'right-3' : 'left-3'
              }`}
            />
            <input
              type="text"
              placeholder={t('admissions.applicationsPage.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${alignStart} ${
                isArabicLayout ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
          </div>
          <div className={`flex flex-col sm:flex-row gap-3 shrink-0 ${isArabicLayout ? 'sm:flex-row-reverse' : ''}`}>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              className={`px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:min-w-[200px] ${alignStart}`}
              dir={isArabicLayout ? 'rtl' : 'ltr'}
            >
              <option value="all">{t('admissions.applicationsPage.filterNationalityAll')}</option>
              {nationalityOptions.hasEmpty && (
                <option value="__empty__">{t('admissions.applicationsPage.filterNationalityNotSpecified')}</option>
              )}
              {nationalityOptions.values.map((nat) => (
                <option key={nat.code} value={nat.code}>
                  {nat.label}
                </option>
              ))}
            </select>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className={`px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:min-w-[180px] ${alignStart}`}
              dir={isArabicLayout ? 'rtl' : 'ltr'}
            >
              <option value="all">{t('admissions.applicationsPage.filterGenderAll')}</option>
              {genderOptions.hasEmpty && (
                <option value="__empty__">{t('admissions.applicationsPage.filterGenderNotSpecified')}</option>
              )}
              {genderOptions.values.map((g) => (
                <option key={g} value={g}>
                  {formatGenderFilterLabel(t, g)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:min-w-[200px] ${alignStart}`}
              dir={isArabicLayout ? 'rtl' : 'ltr'}
            >
              <option value="all">{t('admissions.applicationsPage.filterAll')}</option>
              <option value="pending">{t('admissions.applicationsPage.filterPending')}</option>
              <option value="accepted">{t('admissions.applicationsPage.filterAccepted')}</option>
              <option value="rejected">{t('admissions.applicationsPage.filterRejected')}</option>
              <option value="waitlisted">{t('admissions.applicationsPage.filterWaitlisted')}</option>
              <option value="pending_requests">{t('admissions.applicationsPage.filterPendingRequests', 'Pending applicant requests')}</option>
            </select>
          </div>
        </div>
      </div>

      {filteredApplications.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map((application) => (
            <div
              key={application.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/admissions/applications/${application.id}`)
              }}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/admissions/applications/${application.id}`)}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`min-w-0 flex-1 ${alignStart}`}>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {application.first_name} {application.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 break-all">{application.email}</p>
                </div>
                <div className={`flex items-center gap-2 shrink-0 ${isArabicLayout ? 'flex-row-reverse' : ''}`}>
                  {(pendingApplicantRequestMap[String(application.id)] || 0) > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-900">
                      {t('admissions.applicationsPage.pendingRequestsShort', 'Requests')}{' '}
                      {pendingApplicantRequestMap[String(application.id)]}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      application.status_code
                    )}`}
                    dir={isArabicLayout ? 'rtl' : 'ltr'}
                  >
                    {getStatusIcon(application.status_code)}
                    <span>{getApplicationStatusLabel(t, application.status_code)}</span>
                  </span>
                </div>
              </div>

              <div className={`space-y-2 mb-4 w-full ${alignStart}`}>
                {application.application_number && (
                  <div
                    className="flex w-full items-center gap-2 text-sm text-gray-600"
                    dir={isArabicLayout ? 'rtl' : 'ltr'}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="font-mono" dir="ltr">
                      {application.application_number}
                    </span>
                  </div>
                )}
                <div
                  className="flex w-full items-center gap-2 text-sm text-gray-600"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>{majorDisplay(application.majors)}</span>
                </div>
                {application.colleges && (
                  <div
                    className="flex w-full items-center gap-2 text-sm text-gray-600"
                    dir={isArabicLayout ? 'rtl' : 'ltr'}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>{getLocalizedName(application.colleges, isArabicLayout) || application.colleges.name_en}</span>
                  </div>
                )}
                {application.phone && (
                  <div
                    className="flex w-full items-center gap-2 text-sm text-gray-600"
                    dir={isArabicLayout ? 'rtl' : 'ltr'}
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span dir="ltr">{application.phone}</span>
                  </div>
                )}
                <div
                  className="flex w-full items-center gap-2 text-sm text-gray-600"
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>
                    {t('admissions.applicationsPage.applied')}{' '}
                    {new Date(application.created_at).toLocaleDateString(isArabicLayout ? 'ar' : undefined)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/admissions/applications/${application.id}`)
                  }}
                  className={`w-full bg-primary-50 text-primary-600 py-2 rounded-xl font-medium hover:bg-primary-100 transition-colors flex items-center gap-2 ${
                    isArabicLayout ? 'justify-start' : 'justify-center'
                  }`}
                  dir={isArabicLayout ? 'rtl' : 'ltr'}
                >
                  <Eye className="w-4 h-4 shrink-0" />
                  <span>{t('admissions.applicationsPage.viewDetails')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-12 ${alignStart}`}>
          <Calendar className={`w-16 h-16 mb-4 text-gray-400 ${isArabicLayout ? 'ms-auto' : 'mx-auto'}`} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('admissions.applicationsPage.emptyTitle')}</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all' || nationalityFilter !== 'all' || genderFilter !== 'all'
              ? t('admissions.applicationsPage.emptyFiltered')
              : t('admissions.applicationsPage.emptyNone')}
          </p>
        </div>
      )}
    </div>
  )
}
