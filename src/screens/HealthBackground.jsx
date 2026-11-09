import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle, Info, PencilSimple, X } from '@phosphor-icons/react'
import { useStore } from '../state/store.jsx'
import { Button, Chip, ChipGroup, ProgressBar } from '../components/ui.jsx'
import InlineDropdown from '../components/InlineDropdown.jsx'
import NativeDateField from '../components/NativeDateField.jsx'
import { dateKeyLocal } from '../engine/cyclePredictor.js'
import { PAIN_ANCHORS, painLabel } from '../data/questions.js'
import {
  HEALTH_BACKGROUND_SECTIONS,
  applicableHealthQuestions,
  firstIncompleteHealthSection,
  healthBackgroundProgress,
  healthBackgroundSectionStatus,
  healthBackgroundValues,
  isHealthBackgroundAnswer,
} from '../lib/healthBackground.js'

export default function HealthBackground() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, dispatch } = useStore()
  const initialValues = useMemo(() => healthBackgroundValues(state.answers, state.history), [state.answers, state.history])
  const [sectionIndex, setSectionIndex] = useState(() => firstIncompleteHealthSection(initialValues))
  const [draft, setDraft] = useState(() => initialValues)
  const [view, setView] = useState(() => healthBackgroundProgress(initialValues).complete ? 'overview' : 'form')
  const [editingSingleSection, setEditingSingleSection] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const section = HEALTH_BACKGROUND_SECTIONS[sectionIndex]
  const questions = useMemo(() => applicableHealthQuestions(section, draft), [section, draft])
  const progress = healthBackgroundProgress(draft)
  const returnTo = location.state?.from === 'home'
    ? '/home'
    : location.state?.from === 'learn'
      ? '/learn'
      : location.state?.from === 'route'
        ? '/route/talk'
        : '/me'

  function close() {
    navigate(returnTo)
  }

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function scrollToTop() {
    window.requestAnimationFrame(() => document.querySelector('.health-background')?.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  function openSection(index) {
    setSectionIndex(index)
    setEditingSingleSection(true)
    setJustSaved(false)
    setView('form')
    scrollToTop()
  }

  function discardSectionChanges() {
    const saved = healthBackgroundValues(state.answers, state.history)
    setDraft((current) => {
      const next = { ...current }
      for (const key of section.keys) next[key] = saved[key]
      if (section.keys.includes('familyStatus')) next.familyText = saved.familyText
      return next
    })
  }

  function reviewAll() {
    setSectionIndex(0)
    setEditingSingleSection(false)
    setJustSaved(false)
    setView('form')
    scrollToTop()
  }

  function saveAndContinue() {
    const sectionAnswers = Object.fromEntries(
      questions
        .filter((question) => isHealthBackgroundAnswer(draft[question.key]))
        .map((question) => [question.key, draft[question.key]]),
    )
    const { familyStatus, ...answerChanges } = sectionAnswers
    if (Object.keys(answerChanges).length) {
      dispatch({ type: 'SAVE_HEALTH_BACKGROUND', answers: answerChanges })
    }
    if (familyStatus) {
      dispatch({
        type: 'SET_HISTORY',
        payload: {
          familyStatus,
          familyText: familyStatus === 'yes' ? String(draft.familyText || '').trim().slice(0, 200) : '',
        },
      })
    }
    if (editingSingleSection || sectionIndex === HEALTH_BACKGROUND_SECTIONS.length - 1) {
      setJustSaved(true)
      setView('overview')
      setEditingSingleSection(false)
      scrollToTop()
      return
    }
    setSectionIndex((index) => index + 1)
    scrollToTop()
  }

  function moveBack() {
    if (editingSingleSection) {
      discardSectionChanges()
      setView('overview')
      setEditingSingleSection(false)
      scrollToTop()
      return
    }
    if (sectionIndex === 0) {
      close()
      return
    }
    setSectionIndex((index) => index - 1)
    scrollToTop()
  }

  if (view === 'overview') {
    return (
      <main className="health-background health-background--overview">
        <header className="health-background__topbar">
          <button type="button" aria-label="Go back" onClick={close}><ArrowLeft size={21} weight="bold" /></button>
          <strong>My health background</strong>
          <button type="button" aria-label="Close" onClick={close}><X size={21} weight="bold" /></button>
        </header>

        <section className="health-background-overview__header">
          <span className="health-background-overview__icon" aria-hidden="true">{progress.complete ? <CheckCircle size={25} weight="fill" /> : <PencilSimple size={24} weight="duotone" />}</span>
          <div>
            <p className="eyebrow">{progress.complete ? 'Ready' : 'In progress'}</p>
            <h1>{progress.complete ? 'Your background is ready' : 'Complete your health background'}</h1>
            <p>These answers personalize check-ins, Learn topics, and visit preparation.</p>
          </div>
        </section>

        {justSaved && <p className="health-background-overview__saved" role="status"><CheckCircle size={17} weight="fill" /> Changes saved</p>}

        <div className="health-background-overview__progress">
          <span><strong>{progress.answered} of {progress.total}</strong> answered</span>
          <ProgressBar value={progress.ratio} />
        </div>

        <div className="health-background-overview__sections">
          {HEALTH_BACKGROUND_SECTIONS.map((item, index) => {
            const status = healthBackgroundSectionStatus(item, draft)
            const unavailable = status.total === 0
            return (
              <button key={item.id} type="button" onClick={() => openSection(index)} disabled={unavailable}>
                <span className="health-background-overview__section-copy">
                  <strong>{item.title}</strong>
                  <small>{unavailable ? 'Not applicable right now' : status.summary}</small>
                </span>
                <span className={`health-background-overview__section-status ${status.complete ? 'is-complete' : ''}`}>
                  {unavailable ? 'Skipped' : status.complete ? 'Ready' : `${status.answered}/${status.total}`}
                </span>
                {!unavailable && <ArrowRight size={18} weight="bold" aria-hidden="true" />}
              </button>
            )
          })}
        </div>

        <div className="health-background__privacy"><Info size={19} weight="duotone" aria-hidden="true" /><span>Only you can see this unless you choose to include information in a report.</span></div>
        {!progress.complete && <Button block onClick={() => openSection(firstIncompleteHealthSection(draft))}>Continue where you left off</Button>}
        {progress.complete && <Button block onClick={close}>Done</Button>}
        <button type="button" className="health-background__later" onClick={reviewAll}><PencilSimple size={16} /> Review all answers</button>
      </main>
    )
  }

  return (
    <main className="health-background">
      <header className="health-background__topbar">
        <button type="button" aria-label="Go back" onClick={moveBack}><ArrowLeft size={21} weight="bold" /></button>
        <strong>My health background</strong>
        <button type="button" aria-label="Close" onClick={close}><X size={21} weight="bold" /></button>
      </header>

      <div className="health-background__progress-copy">
        <span>{editingSingleSection ? `Editing ${section.title}` : `Section ${sectionIndex + 1} of ${HEALTH_BACKGROUND_SECTIONS.length}`}</span>
        <span>{questions.filter((question) => isHealthBackgroundAnswer(draft[question.key])).length} of {questions.length} answered</span>
      </div>
      <ProgressBar value={editingSingleSection
        ? (questions.length ? questions.filter((question) => isHealthBackgroundAnswer(draft[question.key])).length / questions.length : 1)
        : (sectionIndex + 1) / HEALTH_BACKGROUND_SECTIONS.length}
      />

      <section className="health-background__intro">
        <p className="eyebrow">{section.title}</p>
        <h1>{section.description}</h1>
        <div className="health-background__personalizes">
          <div>
            <strong>Why we ask</strong>
            <span>{section.whyItMatters}</span>
          </div>
          <details>
            <summary aria-label={`More information about ${section.title.toLowerCase()} questions`}>
              <Info size={19} weight="duotone" aria-hidden="true" />
              <span>More</span>
            </summary>
            <p>{section.science}</p>
          </details>
        </div>
      </section>

      <div className="health-background__questions">
        {questions.length ? questions.map((question, index) => (
          <HealthQuestion
            key={question.key}
            question={question}
            number={index + 1}
            value={draft[question.key]}
            onChange={(value) => update(question.key, value)}
            detailValue={question.key === 'familyStatus' ? draft.familyText : undefined}
            onDetailChange={question.key === 'familyStatus' ? (value) => update('familyText', value) : undefined}
          />
        )) : (
          <div className="health-background__empty">There are no questions in this section based on what you have shared.</div>
        )}
      </div>

      <footer className="health-background__actions">
        <Button block onClick={saveAndContinue}>{editingSingleSection ? 'Save changes' : sectionIndex === HEALTH_BACKGROUND_SECTIONS.length - 1 ? 'Save and finish' : 'Save and continue'}</Button>
        <button type="button" className="health-background__later" onClick={() => {
          if (editingSingleSection) {
            discardSectionChanges()
            setView('overview')
            setEditingSingleSection(false)
          } else {
            discardSectionChanges()
            if (sectionIndex === HEALTH_BACKGROUND_SECTIONS.length - 1) close()
            else setSectionIndex((index) => index + 1)
          }
        }}>{editingSingleSection ? 'Cancel' : 'Do this later'}</button>
      </footer>
    </main>
  )
}

function HealthQuestion({ question, number, value, onChange, detailValue, onDetailChange }) {
  const TODAY = dateKeyLocal()
  const sliderValue = typeof value === 'number' ? value : 0
  return (
    <fieldset className="health-question">
      <legend><span>{number}</span>{question.text}</legend>
      {question.help && <p>{question.help}</p>}

      {question.type === 'chips' && (
        <ChipGroup options={question.options} value={value} onChange={onChange} stack />
      )}

      {question.type === 'multi' && (
        question.options.length > 4
          ? <InlineDropdown
              multiple
              exclusiveValues={question.exclusive ? [question.exclusive] : []}
              value={value}
              options={question.options.map((option) => ({ value: option, label: option }))}
              placeholder="Choose any that apply"
              onChange={onChange}
            />
          : <div className="chips">
              {question.options.map((option) => (
                <Chip
                  key={option}
                  selected={Array.isArray(value) && value.includes(option)}
                  onClick={() => {
                    if (option === question.exclusive) return onChange([option])
                    const current = Array.isArray(value) ? value.filter((item) => item !== question.exclusive) : []
                    onChange(current.includes(option) ? current.filter((item) => item !== option) : [...current, option])
                  }}
                >{option}</Chip>
              ))}
            </div>
      )}

      {question.type === 'date' && (
        <div className="stack-12">
          <NativeDateField
            id={`health-background-${question.key}`}
            label={question.text}
            max={TODAY}
            value={value && value !== 'unknown' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
          />
          <Chip stack selected={value === 'unknown'} onClick={() => onChange('unknown')}>I don't remember</Chip>
        </div>
      )}

      {question.type === 'slider' && (
        <div className="health-question__slider">
          <div><strong>{typeof value === 'number' ? value : 'Choose'}</strong><span>{typeof value === 'number' ? painLabel(value) : 'Move the slider to answer'}</span></div>
          <input className="slider" type="range" min="0" max="10" step="1" value={sliderValue} onChange={(event) => onChange(Number(event.target.value))} />
          <div className="health-question__anchors"><span>0 · No pain</span><span>10 · Worst imaginable</span></div>
          {typeof value === 'number' && <small>{PAIN_ANCHORS.find((anchor) => value >= anchor.range[0] && value <= anchor.range[1])?.desc}</small>}
        </div>
      )}

      {question.type === 'family-history' && (
        <div className="health-question__family">
          <div className="chips">
            {[
              ['yes', 'Yes'],
              ['no', 'No'],
              ['unsure', 'Not sure'],
              ['skipped', 'Prefer not to say'],
            ].map(([optionValue, label]) => (
              <Chip key={optionValue} stack selected={value === optionValue} onClick={() => onChange(optionValue)}>{label}</Chip>
            ))}
          </div>
          {value === 'yes' && (
            <label className="health-question__family-note">
              <span>Anything you want to add? <small>Optional</small></span>
              <textarea
                className="input"
                rows="3"
                maxLength="200"
                value={detailValue || ''}
                placeholder="For example, my parent has very heavy periods."
                onChange={(event) => onDetailChange(event.target.value)}
              />
              <small>{(detailValue || '').length}/200</small>
            </label>
          )}
        </div>
      )}
    </fieldset>
  )
}
