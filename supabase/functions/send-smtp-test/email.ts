export function escapeHtml(s: string) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const DEFAULT_LOGO_URL = 'https://qalam.nuzum.tech/assets/IBU%20Logo.png'

function initialsFromName(name: string) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase?.() || '')
    .join('')
  return initials || 'U'
}

export function buildPlainTextEmail(params: { subject: string; message: string; metaLine?: string }) {
  const subject = String(params.subject || '').trim()
  const msg = String(params.message || '').trim()
  const meta = params.metaLine ? String(params.metaLine).trim() : ''
  return `${subject}\n\n${msg}${meta ? `\n\n${meta}` : ''}`.trim() + '\n'
}

export function buildBrandedEmailHtml(params: {
  brandName?: string
  brandEmail?: string
  logoUrl?: string
  subject: string
  message: string
  metaLabel?: string
  metaValue?: string
  footerLines?: string[]
}) {
  const brandName = String(params.brandName || '').trim()
  const brandEmail = String(params.brandEmail || '').trim()
  const logoUrl = String(params.logoUrl || DEFAULT_LOGO_URL).trim()
  const subject = String(params.subject || '').trim()
  const message = String(params.message || '').trim()
  const metaLabel = String(params.metaLabel || '').trim()
  const metaValue = String(params.metaValue || '').trim()
  const footerLines = Array.isArray(params.footerLines) ? params.footerLines.filter(Boolean).map(String) : []

  const preheader = escapeHtml(message.slice(0, 140))
  const msgHtml = escapeHtml(message).replaceAll('\n', '<br/>')

  const initials = initialsFromName(brandName || brandEmail)
  const safeBrand = escapeHtml(brandName || 'University Admissions')
  const logoAlt = escapeHtml(brandName || 'University logo')

  const metaHtml =
    metaLabel && metaValue
      ? `<div class="meta">${escapeHtml(metaLabel)}: <span class="pill">${escapeHtml(metaValue)}</span></div>`
      : `<div class="meta">${escapeHtml('Automated notification')}</div>`

  const footerDefault: string[] = [
    brandName ? `Sent by ${brandName}.` : 'Sent by the university admissions system.',
    'This is an automated message. Replies may not be monitored.',
    brandEmail ? `From: ${brandEmail}` : '',
  ].filter(Boolean)

  const footer = (footerLines.length ? footerLines : footerDefault).map((l) => `<div>${escapeHtml(l)}</div>`).join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${escapeHtml(subject)}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fb; color: #1e2a3a; }
      .preheader { display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
      .wrap { max-width: 640px; margin: 0 auto; padding: 28px 16px; }
      .card { background: #ffffff; border: 1px solid #dde3ef; border-radius: 12px; padding: 22px; }
      .brand { margin-bottom: 14px; }
      .logo { text-align:center; margin-bottom: 10px; }
      .logo img { height: 64px; width: auto; max-width: 520px; display:inline-block; object-fit: contain; }
      .head { text-align:center; }
      .title { font-size: 18px; font-weight: 800; color: #1a3a6b; margin: 0; }
      .meta { margin-top: 6px; color: #6b7a99; font-size: 13px; }
      .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; background: #e6f7ef; color: #1a7a4a; font-weight: 700; font-size: 12px; }
      .msg { margin-top: 14px; font-size: 14px; line-height: 1.7; color: #1e2a3a; }
      .foot { margin-top: 18px; padding-top: 12px; border-top: 1px solid #eef2fb; color: #6b7a99; font-size: 12px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="preheader">${preheader}</div>
    <div class="wrap">
      <div class="card">
        <div class="brand">
          <div class="logo">
            <img src="${escapeHtml(logoUrl)}" height="64" alt="${logoAlt}" />
          </div>
          <div class="head">
            <p class="title">${escapeHtml(subject)}</p>
            ${metaHtml}
          </div>
        </div>
        <div class="msg">${msgHtml}</div>
        <div class="foot">${footer}</div>
      </div>
      <div style="text-align:center;color:#9aa7bf;font-size:11px;margin-top:10px;">
        ${safeBrand}
      </div>
    </div>
  </body>
</html>`
}

