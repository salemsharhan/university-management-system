/**
 * Finance Permissions Utility
 * Checks if a student can perform an action based on financial milestone and holds
 * Milestones are calculated per semester
 */

import { supabase } from '../lib/supabase'

/**
 * Get financial milestone for a student for a specific semester
 * @param {number} studentId - Student ID
 * @param {number} semesterId - Semester ID
 * @returns {Promise<object>} { milestone: string, hold: string|null }
 */
export const getStudentSemesterMilestone = async (studentId, semesterId) => {
  if (!studentId || !semesterId) {
    return { milestone: 'PM00', hold: null }
  }

  try {
    const { data, error } = await supabase
      .from('student_semester_financial_status')
      .select('financial_milestone_code, financial_hold_reason_code')
      .eq('student_id', studentId)
      .eq('semester_id', semesterId)
      .maybeSingle() // Use maybeSingle() to return null instead of throwing error when no record exists

    if (error) {
      console.error('Error fetching semester milestone:', error)
      return { milestone: 'PM00', hold: null }
    }

    // If no record exists, return default values
    if (!data) {
      return { milestone: 'PM00', hold: null }
    }

    return {
      milestone: data.financial_milestone_code || 'PM00',
      hold: data.financial_hold_reason_code || null
    }
  } catch (err) {
    console.error('Error in getStudentSemesterMilestone:', err)
    return { milestone: 'PM00', hold: null }
  }
}

/**
 * Check if an action is allowed based on financial milestone
 * @param {string} actionCode - The action code to check (e.g., 'SA_LGN', 'SS_VIEW', 'SS_EXAM')
 * @param {string} financialMilestoneCode - Current financial milestone (e.g., 'PM00', 'PM10', 'PM30', 'PM60', 'PM90', 'PM100')
 * @param {string} financialHoldCode - Current financial hold code (optional, e.g., 'FHNP', 'FHPP', 'FHOD', 'FHCH', 'FHEX')
 * @param {string} gradesVisibilityStatus - Grades visibility status for subject actions (optional, e.g., 'GV_HID', 'GV_REL')
 * @returns {object} { allowed: boolean, reason: string }
 */
export const checkFinancePermission = (actionCode, financialMilestoneCode = 'PM00', financialHoldCode = null, gradesVisibilityStatus = null) => {
  // Map of finance milestone codes to their numeric threshold
  const milestoneThresholds = {
    'PM00': 0,
    'PM10': 10,
    'PM30': 30,
    'PM60': 60,
    'PM90': 90,
    'PM100': 100
  }

  const currentThreshold = milestoneThresholds[financialMilestoneCode] || 0

  // First check for financial holds that block ALL actions
  if (financialHoldCode === 'FHCH') {
    // Chargeback blocks all academic actions except payment-related
    if (!actionCode.startsWith('SF_') && !actionCode.startsWith('SP_')) {
      return {
        allowed: false,
        reason: 'Payment chargeback/reversal. All academic actions are blocked. Please contact finance office.'
      }
    }
  }

  // Map subject actions to their required finance milestone thresholds
  const subjectActionRequirements = {
    // Basic viewing - requires PM10 (initial payment)
    'SS_VIEW': 10,
    'SS_MATL': 10,  // View materials
    'SS_DOWN': 10,  // Download materials
    'SS_REC': 10,   // View recordings
    'SS_SYL': 10,   // View syllabus
    'SS_FOR': 10,   // Forum access
    'SS_QNA': 10,   // Q&A access

    // Class attendance - requires PM30
    'SS_JOIN': 30,  // Join live class
    'SS_ATT': 30,   // View attendance (maps to FA_ATT)

    // Exams - requires PM60
    'SS_EXAM': 60,  // Join exam (maps to FA_EXM)
    'SS_EXVR': 60,  // View exam result

    // Grades - requires PM100 and grades released
    'SS_GRAD': 100, // View grades (maps to FA_GRD)
    'SS_FEED': 100, // View instructor feedback (usually shown with grades)

    // Homework - requires PM30
    'SS_HWV': 30,   // View homework
    'SS_HWS': 30,   // Submit homework
    'SS_HWU': 30,   // Update homework submission
  }

  // Map student portal actions to their required finance milestone thresholds
  const studentActionRequirements = {
    // Login and basic access - requires PM10
    'SA_LGN': 10,   // Login (maps to FA_LGN)
    'SA_CRS': 10,   // View courses (maps to FA_CRS)
    'SA_REC': 10,   // View recordings
    'SA_MAT': 10,   // Access materials
    'SA_ASN': 10,   // View assignments

    // Class participation - requires PM30
    'SA_JCL': 30,   // Join live class
    'SA_ATT': 30,   // Mark attendance (maps to FA_ATT)
    'SA_SUB': 30,   // Submit assignment

    // Exams - requires PM60
    'SA_EXM': 60,   // Join exam (maps to FA_EXM)
    'SA_RST': 60,   // View exam result

    // Enrollment actions - requires PM30
    'SE_REG': 30,   // Register semester (maps to FA_REG)
    'SE_ADD': 30,   // Add subject
    'SE_DRP': 30,   // Drop subject
    'SE_CHG': 30,   // Change section

    // Finance actions - always allowed
    'SF_PAY': 0,    // Pay fees (always allowed)
    'SF_INS': 0,    // View installment plan
    'SF_INV': 0,    // View invoices
    'SF_RCP': 0,    // Download receipt
    'SF_BAL': 0,    // View outstanding balance
    'SF_REF': 0,    // Request refund
    'SF_EXT': 0,    // Request payment extension

    // Requests - varies by type
    'SR_DOC': 30,   // Request documents
    'SR_TRN': 100,  // Request transcript (maps to FA_TRN)
    'SR_CER': 100,  // Request certificate (maps to FA_CER)
    'SR_ID': 30,    // Request student ID
    'SR_LTR': 30,   // Request official letter
    'SR_EQV': 30,   // Request course equivalency
    'SR_COM': 0,    // Submit complaint (always allowed)
    'SR_SUP': 0,    // Contact support (always allowed)

    // Profile actions - always allowed
    'SP_PRF': 0,    // Update profile
    'SP_CNT': 0,    // Update contact
    'SP_DOC': 0,    // Upload documents
    'SP_PWD': 0,    // Change password
    'SP_SEC': 0,    // Security settings

    // Communication - always allowed
    'SC_MSG': 0,    // Send message
    'SC_NOT': 0,    // View notifications
    'SC_CAL': 0,    // View calendar
    'SC_EVT': 0,    // Join event
    'SC_SUR': 0,    // Fill survey

    // Graduation actions - requires PM100
    'SG_GRD': 100,  // Apply for graduation
    'SG_CLR': 100,  // Request financial clearance
    'SG_CER': 100,  // Download graduation certificate
    'SG_ALM': 100,  // Join alumni network
    'SG_JOB': 100,  // Access career services
  }

  // Check financial hold blocks
  const holdBlocks = {
    'FHNP': ['SA_ATT', 'SS_JOIN', 'SS_ATT'],  // No payment blocks attendance
    'FHPP': ['SA_EXM', 'SS_EXAM'],            // Partial payment blocks exams
    'FHOD': ['SA_RST', 'SS_EXVR', 'SS_GRAD', 'SR_CER', 'SR_TRN'], // Overdue blocks grades/certificates
    'FHEX': ['SA_EXM', 'SS_EXAM', 'SA_REG', 'SE_REG'], // Exceeded deadline blocks exams and registration
  }

  // Check if this action is blocked by a financial hold
  if (financialHoldCode && holdBlocks[financialHoldCode]) {
    if (holdBlocks[financialHoldCode].includes(actionCode)) {
      const holdMessages = {
        'FHNP': 'No payment received. Please make an initial payment to access this feature.',
        'FHPP': 'Insufficient payment. Please pay at least 60% to access exams.',
        'FHOD': 'Overdue payment. Please clear outstanding balance to access grades and certificates.',
        'FHEX': 'Payment deadline exceeded. Please contact finance office to restore access.',
      }
      return {
        allowed: false,
        reason: holdMessages[financialHoldCode] || 'This action is blocked due to a financial hold.'
      }
    }
  }

  // Check subject action requirements
  if (subjectActionRequirements.hasOwnProperty(actionCode)) {
    const requiredThreshold = subjectActionRequirements[actionCode]
    
    if (currentThreshold < requiredThreshold) {
      const thresholdMessages = {
        10: 'Initial payment (10%) is required to access this feature.',
        30: 'At least 30% payment is required to access this feature.',
        60: 'At least 60% payment is required to access this feature.',
        100: 'Full payment (100%) is required to access this feature.',
      }
      return {
        allowed: false,
        reason: thresholdMessages[requiredThreshold] || `Payment milestone ${requiredThreshold}% is required.`
      }
    }

    // Special check for grades visibility
    if (actionCode === 'SS_GRAD' || actionCode === 'SS_EXVR') {
      if (gradesVisibilityStatus === 'GV_HID') {
        return {
          allowed: false,
          reason: 'Grades are currently hidden. They will be released after full payment and instructor approval.'
        }
      }
      // Even if milestone is PM100, check if grades are released
      if (gradesVisibilityStatus === 'GV_TMP' || gradesVisibilityStatus === 'GV_REL' || gradesVisibilityStatus === 'GV_FIN') {
        // Grades are visible, but still need PM100
        if (currentThreshold < 100) {
          return {
            allowed: false,
            reason: 'Full payment (100%) is required to view grades.'
          }
        }
      }
    }

    return { allowed: true, reason: null }
  }

  // Check student action requirements
  if (studentActionRequirements.hasOwnProperty(actionCode)) {
    const requiredThreshold = studentActionRequirements[actionCode]
    
    if (currentThreshold < requiredThreshold) {
      const thresholdMessages = {
        10: 'Initial payment (10%) is required to access this feature.',
        30: 'At least 30% payment is required to access this feature.',
        60: 'At least 60% payment is required to access this feature.',
        100: 'Full payment (100%) is required to access this feature.',
      }
      return {
        allowed: false,
        reason: thresholdMessages[requiredThreshold] || `Payment milestone ${requiredThreshold}% is required.`
      }
    }

    return { allowed: true, reason: null }
  }

  // If action code is not found in requirements, allow by default (for backward compatibility)
  return { allowed: true, reason: null }
}

/**
 * Calculate financial milestone based on total paid vs total due
 * @param {number} totalPaid - Total amount paid by student
 * @param {number} totalDue - Total amount due
 * @returns {string} Financial milestone code (PM00, PM10, PM30, PM60, PM90, PM100)
 */
export const calculateFinancialMilestone = (totalPaid, totalDue) => {
  if (!totalDue || totalDue === 0) {
    return 'PM100' // No fees = full payment
  }

  const percentage = (totalPaid / totalDue) * 100

  if (percentage >= 100) return 'PM100'
  if (percentage >= 90) return 'PM90'
  if (percentage >= 60) return 'PM60'
  if (percentage >= 30) return 'PM30'
  if (percentage >= 10) return 'PM10'
  return 'PM00'
}

/**
 * Check if student has financial hold
 * @param {string} financialHoldCode - Financial hold code
 * @returns {boolean}
 */
export const hasFinancialHold = (financialHoldCode) => {
  return financialHoldCode !== null && financialHoldCode !== undefined && financialHoldCode !== ''
}

/**
 * Get financial milestone display info
 * @param {string} milestoneCode - Financial milestone code
 * @returns {object} { label: string, percentage: number, color: string }
 */
export const getMilestoneInfo = (milestoneCode) => {
  const milestones = {
    'PM00': { label: 'No Payment', percentage: 0, color: 'bg-gray-100 text-gray-800' },
    'PM10': { label: 'Initial Payment', percentage: 10, color: 'bg-blue-100 text-blue-800' },
    'PM30': { label: '30% Paid', percentage: 30, color: 'bg-yellow-100 text-yellow-800' },
    'PM60': { label: '60% Paid', percentage: 60, color: 'bg-orange-100 text-orange-800' },
    'PM90': { label: '90% Paid', percentage: 90, color: 'bg-green-100 text-green-800' },
    'PM100': { label: 'Full Payment', percentage: 100, color: 'bg-green-200 text-green-900' },
  }
  return milestones[milestoneCode] || milestones['PM00']
}

