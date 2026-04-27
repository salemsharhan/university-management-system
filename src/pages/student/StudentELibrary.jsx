import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const UI = {
  p: '#1a3a6b',
  pl: '#2a5298',
  acc: '#c8a84b',
  bg: '#f4f6fb',
  bdr: '#dde3ef',
  txt: '#1e2a3a',
  muted: '#6b7a99',
}

function pickLocalized(isArabic, ar, en) {
  return (isArabic ? ar : en) || en || ar || '—'
}

function matchesQuery(item, q) {
  if (!q) return true
  const hay = [
    item.title_en,
    item.title_ar,
    item.author_en,
    item.author_ar,
    ...(Array.isArray(item.tags) ? item.tags : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q.toLowerCase())
}

export default function StudentELibrary() {
  const { t } = useTranslation()
  const { isRTL, language } = useLanguage()
  const isArabic = language === 'ar'
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('recommended')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user?.email) return
      setLoading(true)
      setError('')
      try {
        const { data: stu, error: stuErr } = await supabase
          .from('students')
          .select('id, major_id, majors(id, name_en, name_ar)')
          .eq('email', user.email)
          .eq('status', 'active')
          .single()
        if (stuErr) throw stuErr
        if (cancelled) return
        setStudent(stu)

        const { data: rows, error: itErr } = await supabase
          .from('elibrary_items')
          .select('id, major_id, title_en, title_ar, author_en, author_ar, tags, kind, url, cover_emoji, created_at')
          .eq('major_id', stu.major_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        if (itErr) throw itErr
        if (!cancelled) setItems(rows || [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load e-Library')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.email])

  const majorName = useMemo(() => pickLocalized(isArabic, student?.majors?.name_ar, student?.majors?.name_en), [isArabic, student?.majors])

  const filtered = useMemo(() => {
    const base = items.filter((it) => matchesQuery(it, query))
    if (tab === 'recommended') return base
    if (tab === 'saved') return [] // not implemented yet
    if (tab === 'articles') return base.filter((it) => it.kind === 'article')
    if (tab === 'audio') return base.filter((it) => it.kind === 'audio')
    return base
  }, [items, query, tab])

  const stats = useMemo(() => {
    const total = items.length
    const articles = items.filter((i) => i.kind === 'article').length
    const saved = 0
    const borrowed = 0
    return { total, articles, saved, borrowed }
  }, [items])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-slate-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</div>
      )}

      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <button type="button" className="hover:text-slate-900" onClick={() => navigate('/dashboard')}>
          {isArabic ? 'لوحة التحكم' : 'Dashboard'}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-semibold">{isArabic ? 'المكتبة الإلكترونية' : 'e‑Library'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: UI.p }}>
            {isArabic ? 'المكتبة الإلكترونية' : 'e‑Library'}
          </h1>
          <p className="text-sm" style={{ color: UI.muted }}>
            {isArabic ? 'مصادر أكاديمية مقترحة حسب تخصصك.' : 'Academic resources recommended for your major.'}{' '}
            <span className="font-bold">{majorName}</span>
          </p>
        </div>
      </div>

      <div className="rounded-[10px] p-7" style={{ background: `linear-gradient(135deg, ${UI.p} 0%, ${UI.pl} 100%)` }}>
        <div className="text-white text-lg font-extrabold text-center mb-4">{isArabic ? '🔍 ابحث في المكتبة' : '🔍 Search the library'}</div>
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder={isArabic ? 'ابحث عن كتاب، مقال، أو مؤلف...' : 'Search for a book, article, or author...'}
            className="flex-1 px-4 py-2.5 rounded-lg border"
            style={{ borderColor: UI.bdr }}
          />
          <button type="button" className="px-5 py-2.5 rounded-lg font-extrabold" style={{ backgroundColor: UI.acc, color: UI.p }}>
            {isArabic ? 'بحث' : 'Search'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: '#1d4ed8' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'الكتب المتاحة' : 'Available items'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: '#1a7a4a' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'المقالات العلمية' : 'Articles'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.articles}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: UI.acc }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'محفوظاتي' : 'Saved'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.saved}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 border-t-4" style={{ borderColor: UI.bdr, borderTopColor: '#b45309' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: UI.muted }}>
            {isArabic ? 'مستعارة حالياً' : 'Borrowed'}
          </div>
          <div className="text-3xl font-extrabold mt-1" style={{ color: UI.p }}>{stats.borrowed}</div>
        </div>
      </div>

      <div className="flex gap-2 border-b-2 pb-2 overflow-x-auto" style={{ borderColor: UI.bdr }}>
        <button type="button" onClick={() => setTab('recommended')} className={`px-4 py-2 font-bold whitespace-nowrap ${tab === 'recommended' ? 'border-b-2' : ''}`} style={{ borderColor: UI.p, color: tab === 'recommended' ? UI.p : UI.muted }}>
          📚 {isArabic ? 'مقترحة لمقرراتي' : 'Recommended'}
        </button>
        <button type="button" onClick={() => setTab('saved')} className={`px-4 py-2 font-bold whitespace-nowrap ${tab === 'saved' ? 'border-b-2' : ''}`} style={{ borderColor: UI.p, color: tab === 'saved' ? UI.p : UI.muted }}>
          🔖 {isArabic ? 'محفوظاتي' : 'Saved'}
        </button>
        <button type="button" onClick={() => setTab('articles')} className={`px-4 py-2 font-bold whitespace-nowrap ${tab === 'articles' ? 'border-b-2' : ''}`} style={{ borderColor: UI.p, color: tab === 'articles' ? UI.p : UI.muted }}>
          📰 {isArabic ? 'مقالات علمية' : 'Articles'}
        </button>
        <button type="button" onClick={() => setTab('audio')} className={`px-4 py-2 font-bold whitespace-nowrap ${tab === 'audio' ? 'border-b-2' : ''}`} style={{ borderColor: UI.p, color: tab === 'audio' ? UI.p : UI.muted }}>
          🎧 {isArabic ? 'كتب صوتية' : 'Audio'}
        </button>
      </div>

      {tab === 'saved' ? (
        <div className="rounded-xl border bg-white p-6 text-sm" style={{ borderColor: UI.bdr, color: UI.muted }}>
          {isArabic ? 'ميزة المحفوظات ستتوفر لاحقاً.' : 'Saved items will be available later.'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm" style={{ borderColor: UI.bdr, color: UI.muted }}>
          {isArabic ? 'لا توجد عناصر بعد لهذا التخصص.' : 'No e‑Library items yet for this major.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => {
            const title = pickLocalized(isArabic, b.title_ar, b.title_en)
            const author = pickLocalized(isArabic, b.author_ar, b.author_en)
            const emoji = b.cover_emoji || (b.kind === 'article' ? '📰' : b.kind === 'audio' ? '🎧' : '📘')
            const tags = Array.isArray(b.tags) ? b.tags.slice(0, 3) : []
            return (
              <div key={b.id} className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: UI.bdr }}>
                <div className="h-[140px] flex items-center justify-center text-5xl" style={{ background: `linear-gradient(135deg, ${UI.p}, ${UI.pl})` }}>
                  <span aria-hidden="true">{emoji}</span>
                </div>
                <div className="p-4">
                  <div className="font-extrabold text-sm" style={{ color: UI.txt }}>{title}</div>
                  <div className="text-xs mt-1" style={{ color: UI.muted }}>{author}</div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((tg) => (
                        <span key={tg} className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>
                          {tg}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <a
                      href={b.url || '#'}
                      target={b.url ? '_blank' : undefined}
                      rel={b.url ? 'noreferrer' : undefined}
                      className="flex-1 text-center px-3 py-2 rounded-md text-sm font-extrabold"
                      style={{ backgroundColor: UI.p, color: 'white', opacity: b.url ? 1 : 0.6, pointerEvents: b.url ? 'auto' : 'none' }}
                    >
                      {isArabic ? '📖 فتح' : '📖 Open'}
                    </a>
                    <button type="button" className="px-3 py-2 rounded-md border text-sm font-extrabold" style={{ borderColor: UI.bdr, backgroundColor: UI.bg }}>
                      🔖
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

