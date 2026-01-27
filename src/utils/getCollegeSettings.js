import { supabase } from '../lib/supabase'

/**
 * Fetches effective settings for a college
 * If use_university_settings is true, returns university settings
 * Otherwise, returns college-specific settings
 * 
 * @param {number} collegeId - The college ID
 * @returns {Promise<Object>} - Object containing settings and metadata
 */
export async function getCollegeSettings(collegeId) {
  try {
    // First, fetch the college to check if it uses university settings
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id, use_university_settings, academic_settings, financial_settings, email_settings, onboarding_settings, system_settings, examination_settings')
      .eq('id', collegeId)
      .single()

    if (collegeError) {
      throw collegeError
    }

    // If college uses university settings, fetch from university_settings
    if (college.use_university_settings) {
      const { data: universitySettings, error: universityError } = await supabase
        .from('university_settings')
        .select('academic_settings, financial_settings, email_settings, onboarding_settings, system_settings, examination_settings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (universityError && universityError.code !== 'PGRST116') {
        console.error('Error fetching university settings:', universityError)
        // Fallback to college settings if university settings fetch fails
        return {
          academic: college.academic_settings || {},
          financial: college.financial_settings || {},
          email: college.email_settings || {},
          onboarding: college.onboarding_settings || {},
          system: college.system_settings || {},
          examination: college.examination_settings || {},
          usesUniversitySettings: false, // Fallback to college settings
        }
      }

      return {
        academic: universitySettings?.academic_settings || {},
        financial: universitySettings?.financial_settings || {},
        email: universitySettings?.email_settings || {},
        onboarding: universitySettings?.onboarding_settings || {},
        system: universitySettings?.system_settings || {},
        examination: universitySettings?.examination_settings || {},
        usesUniversitySettings: true,
      }
    }

    // Otherwise, use college-specific settings
    return {
      academic: college.academic_settings || {},
      financial: college.financial_settings || {},
      email: college.email_settings || {},
      onboarding: college.onboarding_settings || {},
      system: college.system_settings || {},
      examination: college.examination_settings || {},
      usesUniversitySettings: false,
    }
  } catch (error) {
    console.error('Error fetching college settings:', error)
    // Return empty settings on error
    return {
      academic: {},
      financial: {},
      email: {},
      onboarding: {},
      system: {},
      examination: {},
      usesUniversitySettings: false,
    }
  }
}

/**
 * Gets a specific setting value from college or university settings
 * 
 * @param {number} collegeId - The college ID
 * @param {string} category - Settings category: 'academic', 'financial', 'email', 'onboarding', 'system', 'examination'
 * @param {string} path - Dot-separated path to the setting (e.g., 'creditHours.minPerSemester')
 * @param {any} defaultValue - Default value if setting not found
 * @returns {Promise<any>} - The setting value
 */
export async function getCollegeSetting(collegeId, category, path, defaultValue = null) {
  try {
    const settings = await getCollegeSettings(collegeId)
    const categorySettings = settings[category] || {}
    
    // Navigate through the path
    const keys = path.split('.')
    let value = categorySettings
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      } else {
        return defaultValue
      }
    }
    
    return value !== undefined ? value : defaultValue
  } catch (error) {
    console.error('Error getting college setting:', error)
    return defaultValue
  }
}
