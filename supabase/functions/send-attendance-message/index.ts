// Supabase Edge Function to send WhatsApp messages when attendance is recorded
// This function is triggered by a database trigger on the attendances table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AttendanceRecord {
  id: number
  employee_id: number
  timestamp: string
  status1: boolean | null
  status2: boolean | null
  sn?: string
  stamp?: string
}

interface MessageApiConfig {
  id: string
  company_id: string
  api_type: 'single' | 'bulk'
  api_url: string
  enabled: boolean
  user_id?: number
  message_type?: number
  mode?: number
  custom_message_template?: string
  auth_token?: string
  auth_header?: string
}

interface Employee {
  id: string
  employee_id: string | number
  first_name: string
  last_name: string
  phone?: string
  alternate_phone?: string
  company_id: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the request body (from database trigger)
    const { record, old_record, type } = await req.json()

    if (type !== 'INSERT' || !record) {
      return new Response(
        JSON.stringify({ message: 'Not an insert event or no record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const attendance: AttendanceRecord = record

    // Validate attendance record
    if (!attendance.employee_id) {
      console.error('Attendance record missing employee_id:', attendance)
      return new Response(
        JSON.stringify({ message: 'Attendance record missing employee_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Determine if this is a check-in or check-out
    // status1 = true means check-in, status2 = true means check-out
    let attendanceType: 'check_in' | 'check_out' | null = null
    if (attendance.status1 === true && attendance.status2 !== true) {
      attendanceType = 'check_in'
    } else if (attendance.status2 === true && attendance.status1 !== true) {
      attendanceType = 'check_out'
    } else if (attendance.status1 === true && attendance.status2 === true) {
      // Both true - infer based on time of day
      const hour = new Date(attendance.timestamp).getHours()
      attendanceType = hour < 14 ? 'check_in' : 'check_out'
    }

    if (!attendanceType) {
      return new Response(
        JSON.stringify({ message: 'Could not determine attendance type' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get employee details - try both string and number matching
    const employeeId = attendance.employee_id
    console.log('Looking for employee with ID:', employeeId, 'Type:', typeof employeeId)

    // Try matching as number first (if employee_id is numeric)
    let { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name, phone, alternate_phone, company_id')
      .eq('employee_id', employeeId)
      .limit(1)

    // If no results and employee_id might be stored as string, try string comparison
    if ((!employees || employees.length === 0) && typeof employeeId === 'number') {
      console.log('Trying string match for employee_id:', String(employeeId))
      const result = await supabase
        .from('employees')
        .select('id, employee_id, first_name, last_name, phone, alternate_phone, company_id')
        .eq('employee_id', String(employeeId))
        .limit(1)
      
      employees = result.data
      empError = result.error
    }

    // If still no results, try as text search (in case of leading zeros or formatting)
    if ((!employees || employees.length === 0) && typeof employeeId === 'number') {
      console.log('Trying text search for employee_id:', employeeId)
      const result = await supabase
        .from('employees')
        .select('id, employee_id, first_name, last_name, phone, alternate_phone, company_id')
        .ilike('employee_id', `%${employeeId}%`)
        .limit(1)
      
      employees = result.data
      empError = result.error
    }

    if (empError) {
      console.error('Error fetching employee:', empError)
      return new Response(
        JSON.stringify({ 
          message: 'Database error while fetching employee', 
          error: empError.message,
          employee_id: employeeId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (!employees || employees.length === 0) {
      console.error('Employee not found. Attendance employee_id:', employeeId, 'Type:', typeof employeeId)
      return new Response(
        JSON.stringify({ 
          message: 'Employee not found', 
          employee_id: employeeId,
          suggestion: 'Check if employee_id in attendance matches employee_id in employees table'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const employee: Employee = employees[0]

    if (!employee.company_id) {
      return new Response(
        JSON.stringify({ message: 'Employee has no company_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get message API configuration
    const { data: configs, error: configError } = await supabase
      .from('message_api_configs')
      .select('*')
      .eq('company_id', employee.company_id)
      .eq('enabled', true)
      .limit(1)

    if (configError || !configs || configs.length === 0) {
      console.log('Message API not configured for company:', employee.company_id)
      return new Response(
        JSON.stringify({ message: 'Message API not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const config: MessageApiConfig = configs[0]

    // Get phone number
    const phoneNumber = employee.phone || employee.alternate_phone
    if (!phoneNumber) {
      console.log('Employee has no phone number:', employee.id)
      return new Response(
        JSON.stringify({ message: 'Employee has no phone number' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '')

    // Format timestamp - Add 3 hours to the time
    const date = new Date(attendance.timestamp)
    // Add 3 hours (3 * 60 * 60 * 1000 milliseconds)
    date.setHours(date.getHours() + 3)
    
    const dateStr = date.toLocaleDateString('ar-KW', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
    
    // Format time with AM/PM in English format for better compatibility
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    const timeStr = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`

    // Build message (using actual newlines, not \n)
    let message = ''
    if (attendanceType === 'check_in') {
      message = `تم تسجيل الحضور بنجاح ✅
📅 التاريخ: ${dateStr}
🕐 الوقت: ${timeStr}

شكراً لالتزامك بالمواعيد.`
    } else {
      message = `تم تسجيل الانصراف بنجاح ✅
📅 التاريخ: ${dateStr}
🕐 الوقت: ${timeStr}

شكراً لجهودك اليوم.`
    }

    // Send message based on API type
    let success = false
    if (config.api_type === 'single') {
      // Single message API
      const payload = {
        message: message,
        userId: config.user_id || 0,
        type: config.message_type || 0,
        fileurl: '',
        numbers: cleanPhone
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (config.auth_token && config.auth_header) {
        headers[config.auth_header] = config.auth_token
      }

      const response = await fetch(config.api_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      success = response.ok
    } else {
      // Bulk message API
      const formData = new FormData()
      formData.append('Mode', String(config.mode || 2))
      formData.append('CustomMessage', message)
      formData.append('MessageType', String(config.message_type || 1))
      formData.append('Users[0].Name', `${employee.first_name} ${employee.last_name}`.trim() || String(employee.employee_id))
      formData.append('Users[0].Number', cleanPhone)

      const headers: Record<string, string> = {}

      if (config.auth_token && config.auth_header) {
        headers[config.auth_header] = config.auth_token
      }

      const response = await fetch(config.api_url, {
        method: 'POST',
        headers,
        body: formData
      })

      success = response.ok
    }

    return new Response(
      JSON.stringify({
        success,
        message: success ? 'Message sent successfully' : 'Failed to send message',
        attendanceType,
        employeeId: employee.id,
        phone: cleanPhone
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: success ? 200 : 500
      }
    )
  } catch (error) {
    console.error('Error in send-attendance-message function:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

