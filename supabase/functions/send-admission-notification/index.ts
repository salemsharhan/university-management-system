import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import { buildBrandedEmailHtml, buildPlainTextEmail } from './email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

type SmtpShape = {
  host: string
  port: number
  enableSsl: boolean
  username: string
  password: string
  fromEmail: string
  fromName: string
}

function normalizeEmailSettings(raw: unknown): SmtpShape | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.smtp_host === 'string' && o.smtp_host.length > 0) {
    return {
      host: o.smtp_host,
      port: Number(o.smtp_port) || 587,
      enableSsl: Boolean(o.enable_ssl),
      username: String(o.smtp_username ?? ''),
      password: String(o.smtp_password ?? ''),
      fromEmail: String(o.from_email ?? ''),
      fromName: String(o.from_name ?? ''),
    }
  }
  const smtp = o.smtp as Record<string, unknown> | undefined
  if (smtp && typeof smtp.host === 'string' && String(smtp.host).length > 0) {
    return {
      host: String(smtp.host),
      port: Number(smtp.port) || 587,
      enableSsl: smtp.enableSsl !== false,
      username: String(smtp.username ?? ''),
      password: String(smtp.password ?? ''),
      fromEmail: String(smtp.fromEmail ?? ''),
      fromName: String(smtp.fromName ?? ''),
    }
  }
  return null
}

/** Gmail / Outlook submission AUTH must use the full mailbox address, not the local part only. */
function normalizeSmtpAuth(cfg: SmtpShape): SmtpShape {
  const host = cfg.host.trim().toLowerCase()
  let username = cfg.username.trim()
  const fromEmail = cfg.fromEmail.trim()

  const isGmail =
    host === 'smtp.gmail.com' ||
    host === 'smtp.googlemail.com' ||
    host.endsWith('.gmail.com')
  const isOutlook =
    host === 'smtp-mail.outlook.com' ||
    host === 'smtp.office365.com' ||
    host.includes('.outlook.com') ||
    host.includes('.office365.com')

  if ((isGmail || isOutlook) && username.length > 0 && !username.includes('@') && fromEmail.includes('@')) {
    username = fromEmail
  }

  return { ...cfg, username }
}

async function sendSmtpMessage(cfg: SmtpShape, to: string, subject: string, text: string, html: string) {
  const effective = normalizeSmtpAuth(cfg)
  const port = effective.port
  const implicitTls = port === 465 || port === 994
  const submissionPort = port === 587 || port === 2525 || port === 2587
  const plainNoTls = !implicitTls && !submissionPort && !effective.enableSsl

  const transporter = nodemailer.createTransport({
    host: effective.host.trim(),
    port,
    secure: implicitTls,
    auth:
      effective.username || effective.password
        ? {
            user: effective.username,
            pass: effective.password,
          }
        : undefined,
    ignoreTLS: plainNoTls,
    tls: plainNoTls ? { rejectUnauthorized: false } : { minVersion: 'TLSv1.2' as const },
  })

  const fromAddr =
    effective.fromName && effective.fromEmail
      ? `"${String(effective.fromName).replace(/"/g, '\\"')}" <${effective.fromEmail}>`
      : effective.fromEmail || effective.username

  try {
    await transporter.sendMail({
      from: fromAddr,
      to,
      subject,
      text,
      html,
      headers: {
        'Auto-Submitted': 'auto-generated',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    })
  } finally {
    transporter.close()
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user: authUser },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(jwt)
    if (authErr || !authUser?.id) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: caller, error: callerErr } = await supabaseAdmin
      .from('users')
      .select('id, role, college_id')
      .eq('openId', authUser.id)
      .maybeSingle()

    if (callerErr || !caller?.role) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isAdmin = caller.role === 'admin'
    const isCollegeStaff = caller.role === 'college'
    const isApplicant = caller.role === 'applicant'
    const isStudent = caller.role === 'student'

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const scope = (body.scope as string) || 'college'
    const to = String(body.to || '')
    const subject = String(body.subject || '')
    const message = String(body.message || '')
    const type = (body.type as string) || ''
    const collegeId = body.collegeId != null ? Number(body.collegeId) : null
    const appNo =
      body.application && typeof body.application === 'object'
        ? String((body.application as Record<string, unknown>).application_number || '')
        : ''

    // Applicants may only send a submission confirmation to themselves (prevents abuse)
    if (isApplicant) {
      const authEmail = (authUser.email || '').trim().toLowerCase()
      if (type !== 'submitted' || to.trim().toLowerCase() !== authEmail) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else if (isStudent) {
      // Students may only send a payment confirmation to themselves (prevents abuse)
      const authEmail = (authUser.email || '').trim().toLowerCase()
      if (type !== 'payment_received' || to.trim().toLowerCase() !== authEmail) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else if (!isAdmin && !isCollegeStaff) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!to.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'subject and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let smtpCfg: SmtpShape | null = null
    const loadUniversitySmtp = async () => {
      const { data: row, error: uErr } = await supabaseAdmin
        .from('university_settings')
        .select('email_settings')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (uErr) throw uErr
      return normalizeEmailSettings(row?.email_settings)
    }

    if (scope === 'university') {
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Only administrators can send university notifications' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      smtpCfg = await loadUniversitySmtp()
    } else {
      const effectiveCollegeId = collegeId ?? caller.college_id ?? null
      if (!effectiveCollegeId || !Number.isFinite(Number(effectiveCollegeId))) {
        return new Response(JSON.stringify({ error: 'collegeId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!isApplicant && !isAdmin && Number(caller.college_id) !== Number(effectiveCollegeId)) {
        return new Response(JSON.stringify({ error: 'Not allowed for this college' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: col, error: cErr } = await supabaseAdmin
        .from('colleges')
        .select('email_settings, use_university_settings')
        .eq('id', effectiveCollegeId)
        .maybeSingle()
      if (cErr || !col) {
        return new Response(JSON.stringify({ error: 'College not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let rawEmail = col.email_settings
      if (col.use_university_settings) {
        const uni = await loadUniversitySmtp()
        smtpCfg = uni
      } else {
        smtpCfg = normalizeEmailSettings(rawEmail)
      }
    }

    // Fallback: if college SMTP missing, use university SMTP automatically.
    if (!smtpCfg?.host || !smtpCfg.fromEmail) {
      // Only admins can explicitly ask for university scope, but fallback is allowed for staff workflows.
      // (Applicants are already restricted to "submitted" emails to themselves.)
      smtpCfg = await loadUniversitySmtp()
    }
    if (!smtpCfg?.host || !smtpCfg.fromEmail) {
      return new Response(JSON.stringify({ error: 'SMTP is not configured (host/from_email)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const brandName = smtpCfg?.fromName || ''
    const brandEmail = smtpCfg?.fromEmail || ''
    const html = buildBrandedEmailHtml({
      brandName,
      brandEmail,
      subject,
      message,
      metaLabel: appNo ? 'Application' : '',
      metaValue: appNo || '',
    })
    const text = buildPlainTextEmail({ subject, message, metaLine: appNo ? `Application: ${appNo}` : '' })
    await sendSmtpMessage(smtpCfg, to, subject, text, html)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

