import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const ELEMENT_KEYS = ['elementTextHeadings', 'elementVideo', 'elementQuiz', 'elementPoll', 'elementDiscussion', 'elementAttachment', 'elementMatching', 'elementShortAnswer']
const ELEMENT_ICONS = ['📝', '🎬', '❓', '📊', '💬', '📎', '🔗', '✍️']
const UNIT_KEYS = ['matrixUnit1', 'matrixUnit2', 'matrixUnit3', 'matrixUnit4']

export default function InstructorBuildLesson() {
  const { t } = useTranslation()
  const [lessonTitle, setLessonTitle] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(45)
  const [selectedUnitKey, setSelectedUnitKey] = useState('matrixUnit3')
  const [textContent, setTextContent] = useState('')
  const [quizQuestion, setQuizQuestion] = useState('')
  const [pollQuestion, setPollQuestion] = useState('')

  return (
    <>
      <nav className="bc" aria-label={t('instructorPortal.curriculumMap')}>
        <Link to="/instructor/dashboard">{t('instructorPortal.dashboard')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">{t('instructorPortal.myCourses')}</Link>
        <span className="bc-sep">›</span>
        <Link to="/instructor/courses">ENG101</Link>
        <span className="bc-sep">›</span>
        <span>{t('instructorPortal.buildLesson')}</span>
      </nav>

      <div className="ph">
        <div>
          <h1>{t('instructorPortal.buildInteractiveLesson')}</h1>
          <p className="ph-sub">{t('instructorPortal.unitLessonSubtitle', { unit: 3, lesson: 1, title: '' })}</p>
        </div>
        <div className="ph-acts">
          <span data-status="draft" className="badge" style={{ fontSize: 13, padding: '6px 14px' }}>{t('instructorPortal.draft')}</span>
          <Link to="/instructor/lesson-preview" className="btn btn-gh">👁️ {t('instructorPortal.preview')}</Link>
          <a href="#" className="btn btn-ok">🚀 {t('instructorPortal.publishLesson')}</a>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📋 {t('instructorPortal.lessonInformation')}</div>
            </div>
            <div className="fg">
              <label className="fl" htmlFor="lesson-title"><span className="req">*</span>{t('instructorPortal.lessonTitle')}</label>
              <input id="lesson-title" type="text" className="fc" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>
            <div className="fr">
              <div className="fg">
                <label className="fl" htmlFor="unit-sel">{t('instructorPortal.unit')}</label>
                <select id="unit-sel" className="fc" value={selectedUnitKey} onChange={(e) => setSelectedUnitKey(e.target.value)}>
                  {UNIT_KEYS.map((key) => (
                    <option key={key} value={key}>{t(`instructorPortal.${key}`)}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="fl" htmlFor="est-time">{t('instructorPortal.estimatedTimeMinutes')}</label>
                <input id="est-time" type="number" className="fc" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.linkToLearningOutcomes')}</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: 'var(--p)' }} /> CLO-1</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: 'var(--p)' }} /> CLO-2</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" defaultChecked style={{ accentColor: 'var(--p)' }} /> CLO-3</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: 'var(--p)' }} /> CLO-4</label>
              </div>
            </div>
            <div className="fg">
              <label className="fl">{t('instructorPortal.prerequisiteCondition')}</label>
              <select className="fc">
                <option value="">{t('instructorPortal.noCondition')}</option>
                <option>{t('instructorPortal.matrixUnit2')} — Lesson 4</option>
              </select>
              <div className="fh">{t('instructorPortal.prerequisiteHint')}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <div className="card-title">➕ {t('instructorPortal.addLessonElement')}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ELEMENT_KEYS.map((key, i) => (
                <button key={key} type="button" className="btn btn-gh btn-bl" style={{ padding: 14, flexDirection: 'column', gap: 4, height: 'auto' }}>
                  <span style={{ fontSize: 22 }}>{ELEMENT_ICONS[i]}</span>
                  <span style={{ fontSize: 13 }}>{t(`instructorPortal.${key}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🏗️ {t('instructorPortal.lessonContent')}</div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('instructorPortal.dragToReorder')}</span>
            </div>

            <div className="lb-block">
              <div className="lb-block-hd">
                <span className="lb-block-type">📝 {t('instructorPortal.elementTextHeadings')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-gh btn-sm">↑</button>
                  <button type="button" className="btn btn-gh btn-sm">↓</button>
                  <button type="button" className="btn btn-err btn-sm">{t('instructorPortal.delete')}</button>
                </div>
              </div>
              <textarea className="fc" rows={3} value={textContent} onChange={(e) => setTextContent(e.target.value)} />
            </div>

            <div className="lb-block">
              <div className="lb-block-hd">
                <span className="lb-block-type">🎬 {t('instructorPortal.elementVideo')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-gh btn-sm">↑</button>
                  <button type="button" className="btn btn-gh btn-sm">↓</button>
                  <button type="button" className="btn btn-err btn-sm">{t('instructorPortal.delete')}</button>
                </div>
              </div>
              <div className="fg" style={{ marginBottom: 8 }}>
                <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.videoLink')}</label>
                <input type="url" className="fc" placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.videoDescription')}</label>
                <input type="text" className="fc" placeholder="" />
              </div>
            </div>

            <div className="lb-block" style={{ borderRight: '3px solid var(--info)' }}>
              <div className="lb-block-hd">
                <span className="lb-block-type" style={{ color: 'var(--info)' }}>❓ {t('instructorPortal.elementQuiz')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-gh btn-sm">↑</button>
                  <button type="button" className="btn btn-gh btn-sm">↓</button>
                  <button type="button" className="btn btn-err btn-sm">{t('instructorPortal.delete')}</button>
                </div>
              </div>
              <div className="fg" style={{ marginBottom: 8 }}>
                <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.questionLabel')}</label>
                <input type="text" className="fc" value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="q-opt correct"><input type="radio" name="q1" defaultChecked /> {t('instructorPortal.optionFocus')}</div>
                <div className="q-opt"><input type="radio" name="q1" /> {t('instructorPortal.optionNotes')}</div>
                <div className="q-opt"><input type="radio" name="q1" /> {t('instructorPortal.optionReply')}</div>
                <div className="q-opt"><input type="radio" name="q1" /> {t('instructorPortal.optionQuestions')}</div>
              </div>
              <div className="fh" style={{ marginTop: 8 }}>✅ {t('instructorPortal.correctAnswerHint')}</div>
            </div>

            <div className="lb-block" style={{ borderRight: '3px solid var(--acc)' }}>
              <div className="lb-block-hd">
                <span className="lb-block-type" style={{ color: 'var(--warn)' }}>📊 {t('instructorPortal.elementPoll')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-gh btn-sm">↑</button>
                  <button type="button" className="btn btn-gh btn-sm">↓</button>
                  <button type="button" className="btn btn-err btn-sm">{t('instructorPortal.delete')}</button>
                </div>
              </div>
              <div className="fg" style={{ marginBottom: 8 }}>
                <label className="fl" style={{ fontSize: 12 }}>{t('instructorPortal.pollQuestionLabel')}</label>
                <input type="text" className="fc" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="q-opt"><input type="radio" name="poll1" /> {t('instructorPortal.pollExcellent')}</div>
                <div className="q-opt"><input type="radio" name="poll1" /> {t('instructorPortal.pollGood')}</div>
                <div className="q-opt"><input type="radio" name="poll1" /> {t('instructorPortal.pollNeedsImprovement')}</div>
              </div>
            </div>

            <div className="lb-block" style={{ borderRight: '3px solid var(--purple)' }}>
              <div className="lb-block-hd">
                <span className="lb-block-type" style={{ color: 'var(--purple)' }}>📎 {t('instructorPortal.elementAttachment')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-gh btn-sm">↑</button>
                  <button type="button" className="btn btn-gh btn-sm">↓</button>
                  <button type="button" className="btn btn-err btn-sm">{t('instructorPortal.delete')}</button>
                </div>
              </div>
              <div className="uz">
                <div className="uz-icon">📄</div>
                <div className="uz-text">{t('instructorPortal.uploadDragHint')}</div>
                <div className="uz-hint">{t('instructorPortal.uploadFormatsHint')}</div>
                <input type="file" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <a href="#" className="btn btn-gh">💾 {t('instructorPortal.saveDraft')}</a>
              <Link to="/instructor/lesson-preview" className="btn btn-out">👁️ {t('instructorPortal.preview')}</Link>
              <a href="#" className="btn btn-ok">🚀 {t('instructorPortal.publishLesson')}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
