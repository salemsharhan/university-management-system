import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import GeneralSettings from '../../components/college/GeneralSettings'
import AcademicSettings from '../../components/college/AcademicSettings'
import FinancialSettings from '../../components/college/FinancialSettings'
import EmailSettings from '../../components/college/EmailSettings'
import OnboardingSettings from '../../components/college/OnboardingSettings'
import SystemSettings from '../../components/college/SystemSettings'
import ExaminationSettings from '../../components/college/ExaminationSettings'
import { 
  Building2, 
  GraduationCap, 
  DollarSign, 
  Mail, 
  UserPlus, 
  Settings, 
  FileText,
  Save,
  ArrowLeft,
  Check
} from 'lucide-react'

const defaultGradingScale = [
  { letter: 'A+', minPercent: 95, maxPercent: 100, points: 4.0, passing: true },
  { letter: 'A', minPercent: 90, maxPercent: 94, points: 3.7, passing: true },
  { letter: 'B+', minPercent: 85, maxPercent: 89, points: 3.3, passing: true },
  { letter: 'B', minPercent: 80, maxPercent: 84, points: 3.0, passing: true },
  { letter: 'C+', minPercent: 75, maxPercent: 79, points: 2.7, passing: true },
  { letter: 'C', minPercent: 70, maxPercent: 74, points: 2.0, passing: true },
  { letter: 'D', minPercent: 60, maxPercent: 69, points: 1.0, passing: true },
  { letter: 'F', minPercent: 0, maxPercent: 59, points: 0.0, passing: false },
]

// Helper function to create admin account directly using service role key
async function createAdminAccountDirectly(collegeId, formData, serviceRoleKey, supabaseUrl) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const adminEmail = formData.admin_email || formData.contact_email || formData.official_email
    const adminName = formData.admin_name || formData.dean_name || formData.name_en + ' Admin'

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: formData.admin_password,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        role: 'user',
      },
    })

    if (authError) {
      throw new Error(authError.message)
    }

    // Create user record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        openId: authData.user.id,
        email: adminEmail,
        name: adminName,
        role: 'user',
        college_id: collegeId,
        loginMethod: 'email',
      }, {
        onConflict: 'openId'
      })

    if (userError) {
      // If user record fails, delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw new Error(userError.message)
    }

    console.log('✅ College admin account created successfully')
    return { success: true }
  } catch (error) {
    console.error('Error creating admin account:', error)
    throw error
  }
}

export default function CreateCollege() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [useUniversitySettings, setUseUniversitySettings] = useState(false)
  const [universitySettings, setUniversitySettings] = useState(null)
  const [loadingUniversitySettings, setLoadingUniversitySettings] = useState(false)

  // Fetch university settings when checkbox is checked
  useEffect(() => {
    if (useUniversitySettings && !universitySettings) {
      fetchUniversitySettings()
    }
  }, [useUniversitySettings])

  // Auto-fill form when university settings are loaded
  useEffect(() => {
    if (useUniversitySettings && universitySettings) {
      autoFillFromUniversitySettings()
    }
  }, [universitySettings, useUniversitySettings])

  const fetchUniversitySettings = async () => {
    setLoadingUniversitySettings(true)
    try {
      const { data, error } = await supabase
        .from('university_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching university settings:', error)
        setError('Failed to load university settings')
        setUseUniversitySettings(false)
        return
      }

      if (data && data.length > 0) {
        setUniversitySettings(data[0])
      } else {
        setError('No university settings found. Please configure university settings first.')
        setUseUniversitySettings(false)
      }
    } catch (err) {
      console.error('Error fetching university settings:', err)
      setError('Failed to load university settings')
      setUseUniversitySettings(false)
    } finally {
      setLoadingUniversitySettings(false)
    }
  }

  const autoFillFromUniversitySettings = () => {
    if (!universitySettings) return

    setFormData(prev => {
      const newData = { ...prev }
      
      // Auto-fill Academic settings
      if (universitySettings.academic_settings) {
        const academic = universitySettings.academic_settings
        if (academic.creditHours) {
          newData.min_credit_hours = academic.creditHours.minPerSemester || newData.min_credit_hours
          newData.max_credit_hours = academic.creditHours.maxPerSemester || newData.max_credit_hours
          newData.max_with_permission = academic.creditHours.maxWithPermission || newData.max_with_permission
          newData.min_gpa_for_overload = academic.creditHours.minGpaForOverload || newData.min_gpa_for_overload
        }
        if (academic.gpa) {
          newData.min_passing_gpa = academic.gpa.minPassing || newData.min_passing_gpa
          newData.max_gpa_scale = academic.gpa.maxScale || newData.max_gpa_scale
          newData.honor_roll_min_gpa = academic.gpa.honorRollMin || newData.honor_roll_min_gpa
          newData.probation_threshold = academic.gpa.probationThreshold || newData.probation_threshold
        }
        if (academic.gradingScale) {
          newData.grading_scale = academic.gradingScale
        }
        if (academic.attendance) {
          const att = academic.attendance
          newData.attendance_required = att.required ?? newData.attendance_required
          newData.min_attendance_percentage = att.minPercentage || newData.min_attendance_percentage
          newData.attendance_warning_threshold = att.warningThreshold || newData.attendance_warning_threshold
          newData.max_absence_days = att.maxAbsenceDays || newData.max_absence_days
          newData.present_weight = att.presentWeight || newData.present_weight
          newData.late_weight = att.lateWeight || newData.late_weight
          newData.excused_weight = att.excusedWeight || newData.excused_weight
          newData.count_excused_in_rate = att.countExcusedInRate ?? newData.count_excused_in_rate
          newData.count_late_as_full = att.countLateAsFull ?? newData.count_late_as_full
          newData.enable_warnings = att.enableWarnings ?? newData.enable_warnings
          newData.send_notifications = att.sendNotifications ?? newData.send_notifications
          newData.enforce_max_absence = att.enforceMaxAbsence ?? newData.enforce_max_absence
          newData.create_alert_at_max = att.createAlertAtMax ?? newData.create_alert_at_max
          newData.edit_window_hours = att.editWindowHours || newData.edit_window_hours
          newData.require_approval_after_window = att.requireApprovalAfterWindow ?? newData.require_approval_after_window
          newData.allow_instructor_override = att.allowInstructorOverride ?? newData.allow_instructor_override
          newData.late_arrival_grace_minutes = att.lateArrivalGraceMinutes || newData.late_arrival_grace_minutes
          newData.late_arrival_cutoff_minutes = att.lateArrivalCutoffMinutes || newData.late_arrival_cutoff_minutes
          newData.early_departure_minutes = att.earlyDepartureMinutes || newData.early_departure_minutes
          newData.contest_deadline_days = att.contestDeadlineDays || newData.contest_deadline_days
          newData.contest_review_deadline_days = att.contestReviewDeadlineDays || newData.contest_review_deadline_days
          newData.max_contest_document_size_mb = att.maxContestDocumentSizeMB || newData.max_contest_document_size_mb
          newData.auto_reject_expired = att.autoRejectExpired ?? newData.auto_reject_expired
          newData.require_document_for_contests = att.requireDocumentForContests ?? newData.require_document_for_contests
          newData.default_upcoming_sessions_days = att.defaultUpcomingSessionsDays || newData.default_upcoming_sessions_days
          newData.max_upcoming_sessions_days = att.maxUpcomingSessionsDays || newData.max_upcoming_sessions_days
          newData.auto_exclude_weekends = att.autoExcludeWeekends ?? newData.auto_exclude_weekends
          newData.auto_drop_enabled = att.autoDropEnabled ?? newData.auto_drop_enabled
          newData.auto_drop_threshold = att.autoDropThreshold || newData.auto_drop_threshold
        }
        if (academic.courseRegistration) {
          newData.enable_prerequisite_checking = academic.courseRegistration.enablePrerequisiteChecking ?? newData.enable_prerequisite_checking
          newData.allow_waitlist = academic.courseRegistration.allowWaitlist ?? newData.allow_waitlist
          newData.add_drop_period_days = academic.courseRegistration.addDropPeriodDays || newData.add_drop_period_days
        }
      }

      // Auto-fill Financial settings
      if (universitySettings.financial_settings) {
        const financial = universitySettings.financial_settings
        if (financial.paymentGateway) {
          newData.tap_api_key = financial.paymentGateway.tapApiKey || newData.tap_api_key
          newData.tap_secret_key = financial.paymentGateway.tapSecretKey || newData.tap_secret_key
          newData.test_mode = financial.paymentGateway.testMode ?? newData.test_mode
        }
        if (financial.discounts) {
          newData.enable_early_payment_discount = financial.discounts.enableEarlyPayment ?? newData.enable_early_payment_discount
          newData.early_payment_percent = financial.discounts.earlyPaymentPercent || newData.early_payment_percent
          newData.early_payment_days = financial.discounts.earlyPaymentDays || newData.early_payment_days
          newData.enable_sibling_discount = financial.discounts.enableSibling ?? newData.enable_sibling_discount
          newData.sibling_discount_percent = financial.discounts.siblingPercent || newData.sibling_discount_percent
        }
        if (financial.lateFees) {
          newData.enable_late_fees = financial.lateFees.enabled ?? newData.enable_late_fees
          newData.late_fee_amount = financial.lateFees.amount || newData.late_fee_amount
          newData.late_fee_percentage = financial.lateFees.percentage || newData.late_fee_percentage
          newData.grace_period_days = financial.lateFees.gracePeriodDays || newData.grace_period_days
        }
        if (financial.installments) {
          newData.min_installments = financial.installments.minInstallments || newData.min_installments
          newData.max_installments = financial.installments.maxInstallments || newData.max_installments
        }
        if (financial.reminders) {
          newData.reminder_days_before_due = financial.reminders.daysBeforeDue || newData.reminder_days_before_due
          newData.min_days_between_reminders = financial.reminders.minDaysBetween || newData.min_days_between_reminders
          newData.upcoming_due_window = financial.reminders.upcomingDueWindow || newData.upcoming_due_window
        }
        if (financial.invoice) {
          newData.invoice_prefix = financial.invoice.prefix || newData.invoice_prefix
          newData.invoice_format = financial.invoice.format || newData.invoice_format
          newData.invoice_due_days = financial.invoice.dueDays || newData.invoice_due_days
        }
        if (financial.currency) {
          newData.currency_code = financial.currency.code || newData.currency_code
          newData.currency_symbol = financial.currency.symbol || newData.currency_symbol
          newData.decimal_places = financial.currency.decimalPlaces || newData.decimal_places
        }
        if (financial.refund) {
          newData.allow_refunds = financial.refund.allowRefunds ?? newData.allow_refunds
          newData.full_refund_period_days = financial.refund.fullRefundPeriodDays || newData.full_refund_period_days
          newData.partial_refund_period_days = financial.refund.partialRefundPeriodDays || newData.partial_refund_period_days
          newData.partial_refund_percent = financial.refund.partialRefundPercent || newData.partial_refund_percent
        }
      }

      // Auto-fill Email settings
      if (universitySettings.email_settings) {
        const email = universitySettings.email_settings
        if (email.smtp) {
          newData.smtp_host = email.smtp.host || newData.smtp_host
          newData.smtp_port = email.smtp.port || newData.smtp_port
          newData.enable_ssl = email.smtp.enableSsl ?? newData.enable_ssl
          newData.smtp_username = email.smtp.username || newData.smtp_username
          newData.smtp_password = email.smtp.password || newData.smtp_password
          newData.from_email = email.smtp.fromEmail || newData.from_email
          newData.from_name = email.smtp.fromName || newData.from_name
        }
        newData.enable_email_notifications = email.notifications?.enableEmailNotifications ?? newData.enable_email_notifications
        newData.test_email = email.testEmail || newData.test_email
      }

      // Auto-fill Onboarding settings
      if (universitySettings.onboarding_settings) {
        const onboarding = universitySettings.onboarding_settings
        if (onboarding.application) {
          const app = onboarding.application
          newData.enable_online_applications = app.enableOnlineApplications ?? newData.enable_online_applications
          newData.application_deadline_days = app.deadlineDays || newData.application_deadline_days
          newData.require_document_upload = app.requireDocumentUpload ?? newData.require_document_upload
          newData.application_fee = app.applicationFee || newData.application_fee
          newData.offer_acceptance_days = app.offerAcceptanceDays || newData.offer_acceptance_days
          newData.document_submission_days = app.documentSubmissionDays || newData.document_submission_days
          newData.auto_archive_days = app.autoArchiveDays || newData.auto_archive_days
          newData.min_applicant_age = app.minApplicantAge || newData.min_applicant_age
          newData.max_applicant_age = app.maxApplicantAge || newData.max_applicant_age
          newData.min_scholarship_percent = app.minScholarshipPercent || newData.min_scholarship_percent
          newData.max_scholarship_percent = app.maxScholarshipPercent || newData.max_scholarship_percent
          newData.personal_statement_min_length = app.personalStatementMinLength || newData.personal_statement_min_length
          newData.personal_statement_max_length = app.personalStatementMaxLength || newData.personal_statement_max_length
          newData.scholarship_justification_min_length = app.scholarshipJustificationMinLength || newData.scholarship_justification_min_length
          newData.scholarship_justification_max_length = app.scholarshipJustificationMaxLength || newData.scholarship_justification_max_length
          newData.default_priority = app.defaultPriority || newData.default_priority
          newData.default_interview_type = app.defaultInterviewType || newData.default_interview_type
        }
        if (onboarding.documents) {
          newData.max_document_size_mb = onboarding.documents.maxSizeMB || newData.max_document_size_mb
          newData.allowed_file_types = onboarding.documents.allowedTypes || newData.allowed_file_types
        }
        if (onboarding.committee) {
          newData.min_committee_members = onboarding.committee.minMembers || newData.min_committee_members
          newData.require_unanimous = onboarding.committee.requireUnanimous ?? newData.require_unanimous
          newData.decision_timeout_days = onboarding.committee.decisionTimeoutDays || newData.decision_timeout_days
        }
      }

      // Auto-fill System settings
      if (universitySettings.system_settings) {
        const system = universitySettings.system_settings
        if (system.security) {
          newData.session_timeout_minutes = system.security.sessionTimeoutMinutes || newData.session_timeout_minutes
          newData.password_expiry_days = system.security.passwordExpiryDays || newData.password_expiry_days
          newData.max_login_attempts = system.security.maxLoginAttempts || newData.max_login_attempts
          newData.account_lockout_minutes = system.security.accountLockoutMinutes || newData.account_lockout_minutes
          newData.enable_two_factor = system.security.enableTwoFactor ?? newData.enable_two_factor
        }
        if (system.fileUpload) {
          newData.max_file_upload_size_mb = system.fileUpload.maxSizeMB || newData.max_file_upload_size_mb
          newData.storage_provider = system.fileUpload.storageProvider || newData.storage_provider
        }
        if (system.maintenance) {
          newData.maintenance_enabled = system.maintenance.enabled ?? newData.maintenance_enabled
          newData.maintenance_message = system.maintenance.message || newData.maintenance_message
        }
        if (system.backup) {
          newData.backup_enabled = system.backup.enabled ?? newData.backup_enabled
          newData.backup_retention_days = system.backup.retentionDays || newData.backup_retention_days
          newData.backup_schedule = system.backup.schedule || newData.backup_schedule
        }
        if (system.localization) {
          newData.auto_detect_language = system.localization.autoDetectUserLanguage ?? newData.auto_detect_language
          newData.enable_rtl = system.localization.enableRtlSupport ?? newData.enable_rtl
        }
      }

      // Auto-fill Examination settings
      if (universitySettings.examination_settings) {
        const exam = universitySettings.examination_settings
        newData.min_passing_percentage = exam.min_passing_percentage || newData.min_passing_percentage
        newData.min_passing_grade_points = exam.min_passing_grade_points || newData.min_passing_grade_points
        newData.min_excellence_percentage = exam.min_excellence_percentage || newData.min_excellence_percentage
        newData.min_good_percentage = exam.min_good_percentage || newData.min_good_percentage
        newData.default_midterm_weight = exam.default_midterm_weight || newData.default_midterm_weight
        newData.default_final_weight = exam.default_final_weight || newData.default_final_weight
        newData.default_quiz_weight = exam.default_quiz_weight || newData.default_quiz_weight
        newData.default_assignment_weight = exam.default_assignment_weight || newData.default_assignment_weight
        newData.enforce_weight_sum_100 = exam.enforce_weight_sum_100 ?? newData.enforce_weight_sum_100
        newData.allow_custom_exam_types = exam.allow_custom_exam_types ?? newData.allow_custom_exam_types
        newData.exam_schedule_generation_window_days = exam.exam_schedule_generation_window_days || newData.exam_schedule_generation_window_days
        newData.default_upcoming_exams_window_days = exam.default_upcoming_exams_window_days || newData.default_upcoming_exams_window_days
        newData.min_preparation_days = exam.min_preparation_days || newData.min_preparation_days
        newData.max_exams_per_day = exam.max_exams_per_day || newData.max_exams_per_day
        newData.allow_weekend_exams = exam.allow_weekend_exams ?? newData.allow_weekend_exams
        newData.allow_overlapping_exams = exam.allow_overlapping_exams ?? newData.allow_overlapping_exams
        newData.allow_makeup_exams = exam.allow_makeup_exams ?? newData.allow_makeup_exams
        newData.makeup_request_deadline_days = exam.makeup_request_deadline_days || newData.makeup_request_deadline_days
        newData.max_makeup_attempts = exam.max_makeup_attempts || newData.max_makeup_attempts
        newData.require_room_allocation = exam.require_room_allocation ?? newData.require_room_allocation
        newData.students_per_room = exam.students_per_room || newData.students_per_room
        newData.social_distancing_capacity_percent = exam.social_distancing_capacity_percentage || newData.social_distancing_capacity_percent
        newData.enforce_social_distancing = exam.enforce_social_distancing ?? newData.enforce_social_distancing
        newData.require_invigilators = exam.require_invigilators ?? newData.require_invigilators
        newData.min_invigilators_per_room = exam.min_invigilators_per_room || newData.min_invigilators_per_room
        newData.max_invigilator_assignments_per_day = exam.max_invigilator_assignments_per_day || newData.max_invigilator_assignments_per_day
        newData.students_per_invigilator = exam.students_per_invigilator || newData.students_per_invigilator
        newData.enable_conflict_detection = exam.enable_conflict_detection ?? newData.enable_conflict_detection
        newData.check_student_conflicts = exam.check_student_conflicts ?? newData.check_student_conflicts
        newData.check_invigilator_conflicts = exam.check_invigilator_conflicts ?? newData.check_invigilator_conflicts
        newData.check_room_conflicts = exam.check_room_conflicts ?? newData.check_room_conflicts
      }

      return newData
    })
  }

  const [formData, setFormData] = useState({
    // General
    code: '',
    name_en: '',
    name_ar: '',
    type: '',
    description_en: '',
    description_ar: '',
    abbreviation: '',
    official_email: '',
    phone_number: '',
    website_url: '',
    address_en: '',
    address_ar: '',
    logo_url: '',
    primary_color: '#952562',
    secondary_color: '#E82B5E',
    // Contact
    dean_name: '',
    dean_email: '',
    dean_phone: '',
    contact_email: '',
    contact_phone: '',
    // College Admin Account
    create_admin_account: true,
    admin_email: '',
    admin_password: '',
    admin_name: '',
    // Location
    building: '',
    floor: '',
    room_number: '',
    location_description: '',
    // Vision & Mission
    vision: '',
    mission: '',
    // Additional
    established_date: '',
    accreditation_info: '',
    student_id_prefix: 'STU',
    student_id_format: '{prefix}{year}{sequence:D4}',
    student_id_starting_number: 1,
    instructor_id_prefix: 'INS',
    instructor_id_format: '{prefix}{year}{sequence:D4}',
    instructor_id_starting_number: 1,
    default_language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    
    // Academic
    min_credit_hours: 12,
    max_credit_hours: 18,
    max_with_permission: 21,
    min_gpa_for_overload: 3,
    min_passing_gpa: 2,
    max_gpa_scale: 4,
    honor_roll_min_gpa: 3.5,
    probation_threshold: 2,
    grading_scale: defaultGradingScale,
    attendance_required: true,
    min_attendance_percentage: 75,
    attendance_warning_threshold: 80,
    max_absence_days: 7,
    present_weight: 100,
    late_weight: 100,
    excused_weight: 100,
    count_excused_in_rate: true,
    count_late_as_full: true,
    enable_warnings: true,
    send_notifications: true,
    enforce_max_absence: true,
    create_alert_at_max: true,
    edit_window_hours: 24,
    require_approval_after_window: true,
    allow_instructor_override: true,
    late_arrival_grace_minutes: 15,
    late_arrival_cutoff_minutes: 30,
    early_departure_minutes: 15,
    contest_deadline_days: 7,
    contest_review_deadline_days: 14,
    max_contest_document_size_mb: 5,
    auto_reject_expired: true,
    require_document_for_contests: true,
    default_upcoming_sessions_days: 7,
    max_upcoming_sessions_days: 30,
    auto_exclude_weekends: true,
    auto_drop_enabled: true,
    auto_drop_threshold: 50,
    enable_prerequisite_checking: true,
    allow_waitlist: true,
    add_drop_period_days: 14,

    // Financial
    tap_api_key: '',
    tap_secret_key: '',
    test_mode: true,
    enable_early_payment_discount: true,
    early_payment_percent: 5,
    early_payment_days: 10,
    enable_sibling_discount: true,
    sibling_discount_percent: 10,
    enable_late_fees: true,
    late_fee_amount: 25,
    late_fee_percentage: 5,
    grace_period_days: 7,
    min_installments: 2,
    max_installments: 24,
    reminder_days_before_due: 3,
    min_days_between_reminders: 2,
    upcoming_due_window: 7,
    invoice_prefix: 'INV',
    invoice_format: '{prefix}-{year}-{sequence:D6}',
    invoice_due_days: 30,
    currency_code: 'USD',
    currency_symbol: '$',
    decimal_places: 2,
    allow_refunds: true,
    full_refund_period_days: 7,
    partial_refund_period_days: 30,
    partial_refund_percent: 50,

    // Email
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    enable_ssl: true,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    enable_email_notifications: true,
    test_email: 'test@example.com',

    // Onboarding
    enable_online_applications: true,
    application_deadline_days: 30,
    require_document_upload: true,
    application_fee: 100,
    offer_acceptance_days: 14,
    document_submission_days: 7,
    auto_archive_days: 365,
    min_applicant_age: 16,
    max_applicant_age: 100,
    min_scholarship_percent: 1,
    max_scholarship_percent: 100,
    personal_statement_min_length: 100,
    personal_statement_max_length: 2000,
    scholarship_justification_min_length: 50,
    scholarship_justification_max_length: 1000,
    default_priority: 'normal',
    default_interview_type: 'in_person',
    max_document_size_mb: 5,
    allowed_file_types: ['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX'],
    min_committee_members: 3,
    require_unanimous: false,
    decision_timeout_days: 30,

    // System
    session_timeout_minutes: 30,
    password_expiry_days: 90,
    max_login_attempts: 5,
    account_lockout_minutes: 15,
    enable_two_factor: false,
    max_file_upload_size_mb: 10,
    storage_provider: 'local',
    maintenance_enabled: false,
    maintenance_message: '',
    backup_enabled: true,
    backup_retention_days: 30,
    backup_schedule: '0 2 * * *',
    auto_detect_language: true,
    enable_rtl: true,

    // Examination
    min_passing_percentage: 50,
    min_passing_grade_points: 2,
    min_excellence_percentage: 90,
    min_good_percentage: 75,
    default_midterm_weight: 30,
    default_final_weight: 40,
    default_quiz_weight: 10,
    default_assignment_weight: 20,
    enforce_weight_sum_100: true,
    allow_custom_exam_types: true,
    exam_schedule_generation_window_days: 90,
    default_upcoming_exams_window_days: 7,
    min_preparation_days: 7,
    max_exams_per_day: 3,
    allow_weekend_exams: false,
    allow_overlapping_exams: false,
    allow_makeup_exams: true,
    makeup_request_deadline_days: 3,
    max_makeup_attempts: 2,
    makeup_exam_penalty_percentage: 0,
    require_room_allocation: true,
    students_per_room: 30,
    social_distancing_capacity_percent: 50,
    enforce_social_distancing: false,
    require_invigilators: true,
    min_invigilators_per_room: 1,
    max_invigilator_assignments_per_day: 3,
    students_per_invigilator: 30,
    enable_conflict_detection: true,
    check_student_conflicts: true,
    check_invigilator_conflicts: true,
    check_room_conflicts: true,
  })

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'email', label: 'Email (SMTP)', icon: Mail },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
    { id: 'system', label: 'System', icon: Settings },
    { id: 'examination', label: 'Examination', icon: FileText },
  ]

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleGradingScaleChange = (index, field, value) => {
    const newScale = [...formData.grading_scale]
    newScale[index] = { ...newScale[index], [field]: value }
    setFormData(prev => ({ ...prev, grading_scale: newScale }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      // Build settings JSONB objects
      const academicSettings = {
        creditHours: {
          minPerSemester: formData.min_credit_hours,
          maxPerSemester: formData.max_credit_hours,
          maxWithPermission: formData.max_with_permission,
          minGpaForOverload: formData.min_gpa_for_overload,
        },
        gpa: {
          minPassing: formData.min_passing_gpa,
          maxScale: formData.max_gpa_scale,
          honorRollMin: formData.honor_roll_min_gpa,
          probationThreshold: formData.probation_threshold,
        },
        gradingScale: formData.grading_scale,
        attendance: {
          required: formData.attendance_required,
          minPercentage: formData.min_attendance_percentage,
          warningThreshold: formData.attendance_warning_threshold,
          maxAbsenceDays: formData.max_absence_days,
          presentWeight: formData.present_weight,
          lateWeight: formData.late_weight,
          excusedWeight: formData.excused_weight,
          countExcusedInRate: formData.count_excused_in_rate,
          countLateAsFull: formData.count_late_as_full,
          enableWarnings: formData.enable_warnings,
          sendNotifications: formData.send_notifications,
          enforceMaxAbsence: formData.enforce_max_absence,
          createAlertAtMax: formData.create_alert_at_max,
          editWindowHours: formData.edit_window_hours,
          requireApprovalAfterWindow: formData.require_approval_after_window,
          allowInstructorOverride: formData.allow_instructor_override,
          lateArrivalGraceMinutes: formData.late_arrival_grace_minutes,
          lateArrivalCutoffMinutes: formData.late_arrival_cutoff_minutes,
          earlyDepartureMinutes: formData.early_departure_minutes,
          contestDeadlineDays: formData.contest_deadline_days,
          contestReviewDeadlineDays: formData.contest_review_deadline_days,
          maxContestDocumentSizeMB: formData.max_contest_document_size_mb,
          autoRejectExpired: formData.auto_reject_expired,
          requireDocumentForContests: formData.require_document_for_contests,
          defaultUpcomingSessionsDays: formData.default_upcoming_sessions_days,
          maxUpcomingSessionsDays: formData.max_upcoming_sessions_days,
          autoExcludeWeekends: formData.auto_exclude_weekends,
          autoDropEnabled: formData.auto_drop_enabled,
          autoDropThreshold: formData.auto_drop_threshold,
        },
        courseRegistration: {
          enablePrerequisiteChecking: formData.enable_prerequisite_checking,
          allowWaitlist: formData.allow_waitlist,
          addDropPeriodDays: formData.add_drop_period_days,
        },
      }

      const financialSettings = {
        paymentGateway: {
          tapApiKey: formData.tap_api_key,
          tapSecretKey: formData.tap_secret_key,
          testMode: formData.test_mode,
        },
        discounts: {
          enableEarlyPayment: formData.enable_early_payment_discount,
          earlyPaymentPercent: formData.early_payment_percent,
          earlyPaymentDays: formData.early_payment_days,
          enableSiblingDiscount: formData.enable_sibling_discount,
          siblingDiscountPercent: formData.sibling_discount_percent,
        },
        lateFees: {
          enabled: formData.enable_late_fees,
          amount: formData.late_fee_amount,
          percentage: formData.late_fee_percentage,
          gracePeriodDays: formData.grace_period_days,
        },
        installments: {
          minInstallments: formData.min_installments,
          maxInstallments: formData.max_installments,
        },
        reminders: {
          daysBeforeDue: formData.reminder_days_before_due,
          minDaysBetween: formData.min_days_between_reminders,
          upcomingDueWindow: formData.upcoming_due_window,
        },
        invoice: {
          prefix: formData.invoice_prefix,
          format: formData.invoice_format,
          dueDays: formData.invoice_due_days,
        },
        currency: {
          code: formData.currency_code,
          symbol: formData.currency_symbol,
          decimalPlaces: formData.decimal_places,
        },
        refund: {
          allowRefunds: formData.allow_refunds,
          fullRefundPeriodDays: formData.full_refund_period_days,
          partialRefundPeriodDays: formData.partial_refund_period_days,
          partialRefundPercent: formData.partial_refund_percent,
        },
      }

      const emailSettings = {
        smtp: {
          host: formData.smtp_host,
          port: formData.smtp_port,
          enableSsl: formData.enable_ssl,
          username: formData.smtp_username,
          password: formData.smtp_password,
          fromEmail: formData.from_email,
          fromName: formData.from_name,
        },
        notifications: {
          enableEmailNotifications: formData.enable_email_notifications,
        },
        testEmail: formData.test_email,
      }

      const onboardingSettings = {
        application: {
          enableOnlineApplications: formData.enable_online_applications,
          deadlineDays: formData.application_deadline_days,
          requireDocumentUpload: formData.require_document_upload,
          applicationFee: formData.application_fee,
          offerAcceptanceDays: formData.offer_acceptance_days,
          documentSubmissionDays: formData.document_submission_days,
          autoArchiveDays: formData.auto_archive_days,
          minApplicantAge: formData.min_applicant_age,
          maxApplicantAge: formData.max_applicant_age,
          minScholarshipPercent: formData.min_scholarship_percent,
          maxScholarshipPercent: formData.max_scholarship_percent,
          personalStatementMinLength: formData.personal_statement_min_length,
          personalStatementMaxLength: formData.personal_statement_max_length,
          scholarshipJustificationMinLength: formData.scholarship_justification_min_length,
          scholarshipJustificationMaxLength: formData.scholarship_justification_max_length,
          defaultPriority: formData.default_priority,
          defaultInterviewType: formData.default_interview_type,
        },
        documents: {
          maxSizeMB: formData.max_document_size_mb,
          allowedTypes: formData.allowed_file_types,
        },
        committee: {
          minMembers: formData.min_committee_members,
          requireUnanimous: formData.require_unanimous,
          decisionTimeoutDays: formData.decision_timeout_days,
        },
      }

      const systemSettings = {
        security: {
          sessionTimeoutMinutes: formData.session_timeout_minutes,
          passwordExpiryDays: formData.password_expiry_days,
          maxLoginAttempts: formData.max_login_attempts,
          accountLockoutMinutes: formData.account_lockout_minutes,
          enableTwoFactor: formData.enable_two_factor,
        },
        fileUpload: {
          maxSizeMB: formData.max_file_upload_size_mb,
          storageProvider: formData.storage_provider,
        },
        maintenance: {
          enabled: formData.maintenance_enabled,
          message: formData.maintenance_message,
        },
        backup: {
          enabled: formData.backup_enabled,
          retentionDays: formData.backup_retention_days,
          schedule: formData.backup_schedule,
        },
        localization: {
          defaultLanguage: formData.default_language,
          autoDetectLanguage: formData.auto_detect_language,
          enableRTL: formData.enable_rtl,
        },
      }

      const examinationSettings = {
        grading: {
          minPassingPercentage: formData.min_passing_percentage,
          minPassingGradePoints: formData.min_passing_grade_points,
          minExcellencePercentage: formData.min_excellence_percentage,
          minGoodPercentage: formData.min_good_percentage,
        },
        examTypes: {
          defaultMidtermWeight: formData.default_midterm_weight,
          defaultFinalWeight: formData.default_final_weight,
          defaultQuizWeight: formData.default_quiz_weight,
          defaultAssignmentWeight: formData.default_assignment_weight,
          enforceWeightSum100: formData.enforce_weight_sum_100,
          allowCustomTypes: formData.allow_custom_exam_types,
        },
        scheduling: {
          generationWindowDays: formData.exam_schedule_generation_window_days,
          defaultUpcomingExamsWindowDays: formData.default_upcoming_exams_window_days,
          minPreparationDays: formData.min_preparation_days,
          maxExamsPerDay: formData.max_exams_per_day,
          allowWeekendExams: formData.allow_weekend_exams,
          allowOverlappingExams: formData.allow_overlapping_exams,
        },
        makeup: {
          allowMakeupExams: formData.allow_makeup_exams,
          requestDeadlineDays: formData.makeup_request_deadline_days,
          maxAttempts: formData.max_makeup_attempts,
          penaltyPercentage: formData.makeup_exam_penalty_percentage,
        },
        roomAllocation: {
          requireRoomAllocation: formData.require_room_allocation,
          studentsPerRoom: formData.students_per_room,
          socialDistancingCapacityPercent: formData.social_distancing_capacity_percent,
          enforceSocialDistancing: formData.enforce_social_distancing,
        },
        invigilator: {
          requireInvigilators: formData.require_invigilators,
          minInvigilatorsPerRoom: formData.min_invigilators_per_room,
          maxAssignmentsPerDay: formData.max_invigilator_assignments_per_day,
          studentsPerInvigilator: formData.students_per_invigilator,
        },
        conflictDetection: {
          enabled: formData.enable_conflict_detection,
          checkStudentConflicts: formData.check_student_conflicts,
          checkInvigilatorConflicts: formData.check_invigilator_conflicts,
          checkRoomConflicts: formData.check_room_conflicts,
        },
      }

      const { data, error: insertError } = await supabase
        .from('colleges')
        .insert({
          code: formData.code,
          name_en: formData.name_en,
          name_ar: formData.name_ar,
          type: formData.type || null,
          description_en: formData.description_en || null,
          description_ar: formData.description_ar || null,
          abbreviation: formData.abbreviation,
          official_email: formData.official_email,
          phone_number: formData.phone_number,
          website_url: formData.website_url,
          address_en: formData.address_en,
          address_ar: formData.address_ar,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          student_id_prefix: formData.student_id_prefix,
          student_id_format: formData.student_id_format,
          student_id_starting_number: formData.student_id_starting_number,
          instructor_id_prefix: formData.instructor_id_prefix,
          instructor_id_format: formData.instructor_id_format,
          instructor_id_starting_number: formData.instructor_id_starting_number,
          dean_name: formData.dean_name || null,
          dean_email: formData.dean_email || null,
          dean_phone: formData.dean_phone || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          building: formData.building || null,
          floor: formData.floor || null,
          room_number: formData.room_number || null,
          location_description: formData.location_description || null,
          vision: formData.vision || null,
          mission: formData.mission || null,
          established_date: formData.established_date || null,
          accreditation_info: formData.accreditation_info || null,
          academic_settings: useUniversitySettings ? null : academicSettings,
          financial_settings: useUniversitySettings ? null : financialSettings,
          email_settings: useUniversitySettings ? null : emailSettings,
          onboarding_settings: useUniversitySettings ? null : onboardingSettings,
          system_settings: useUniversitySettings ? null : systemSettings,
          examination_settings: useUniversitySettings ? null : examinationSettings,
          use_university_settings: useUniversitySettings,
          status: 'active',
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Create college admin login account if requested
      if (formData.create_admin_account !== false && formData.admin_password) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
          
          // Try using Edge Function first
          try {
            // Use Supabase functions.invoke for proper CORS handling
            // Note: The function has verify_jwt = false, so anon key works
            const { data: functionResult, error: functionError } = await supabase.functions.invoke('create-auth-user', {
              body: {
                email: formData.admin_email || formData.contact_email || formData.official_email || formData.dean_email,
                password: formData.admin_password,
                role: 'user',
                college_id: data.id,
                name: formData.admin_name || formData.dean_name || formData.name_en + ' Admin',
              },
            })

            if (functionError) {
              throw functionError
            }

            if (functionResult?.success) {
              console.log('✅ College admin account created successfully')
            } else {
              throw new Error(functionResult?.error || 'Unknown error')
            }
          } catch (edgeError) {
            console.warn('⚠️  Edge Function failed, trying direct method:', edgeError)
            // Fallback: Use service role key if available
            if (serviceRoleKey) {
              await createAdminAccountDirectly(data.id, formData, serviceRoleKey, supabaseUrl)
            } else {
              console.warn('⚠️  Service role key not available. Please create admin account manually using:')
              console.warn(`   npm run create:login college ${data.id} "${formData.admin_email || formData.contact_email || formData.official_email}" "${formData.admin_password}" "${formData.admin_name || formData.dean_name || formData.name_en + ' Admin'}"`)
            }
          }
        } catch (err) {
          console.error('Error creating admin account:', err)
          // Don't fail the college creation if account creation fails
        }
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/admin/colleges')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to create college')
    } finally {
      setLoading(false)
    }
  }


  // Due to length, I'll create a simplified version that shows the structure
  // The full form would have all sections. Let me create a more manageable component structure.
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New College</h1>
          <p className="text-gray-600 mt-1">Configure all settings for the new college</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-4 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium whitespace-nowrap">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {activeTab === 'general' && (
                <GeneralSettings 
                  formData={formData} 
                  handleChange={handleChange}
                  useUniversitySettings={useUniversitySettings}
                  setUseUniversitySettings={setUseUniversitySettings}
                />
              )}
              {activeTab === 'academic' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <AcademicSettings 
                    formData={formData} 
                    handleChange={handleChange} 
                    handleGradingScaleChange={handleGradingScaleChange}
                  />
                </div>
              )}
              {activeTab === 'financial' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <FinancialSettings formData={formData} handleChange={handleChange} />
                </div>
              )}
              {activeTab === 'email' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <EmailSettings formData={formData} handleChange={handleChange} />
                </div>
              )}
              {activeTab === 'onboarding' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <OnboardingSettings formData={formData} handleChange={handleChange} />
                </div>
              )}
              {activeTab === 'system' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <SystemSettings formData={formData} handleChange={handleChange} />
                </div>
              )}
              {activeTab === 'examination' && (
                <div>
                  {useUniversitySettings && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Fields are pre-filled from university settings. You can edit them as needed.
                      </p>
                    </div>
                  )}
                  <ExaminationSettings formData={formData} handleChange={handleChange} />
                </div>
              )}
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mx-6 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
                <Check className="w-5 h-5" />
                <span>College created successfully! Redirecting...</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-primary-gradient text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{loading ? 'Creating...' : 'Create College'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

