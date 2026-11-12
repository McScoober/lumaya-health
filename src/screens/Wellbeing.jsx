import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowCounterClockwise,
  BookOpenText,
  FlowerLotus,
  MoonStars,
  Pause,
  Play,
  PersonSimple,
  Star,
  Target,
  Timer,
} from '@phosphor-icons/react'
import { TopBar } from '../components/ui.jsx'

const TOOLS = [
  { id: 'reset', title: 'Reset', description: 'A one-minute pause.', duration: 'About 1 minute', Icon: FlowerLotus, tone: 'sage' },
  { id: 'focus', title: 'Focus', description: 'Start one thing, five minutes at a time.', duration: '5-15 minutes', Icon: Target, tone: 'lavender' },
  { id: 'wind-down', title: 'Wind down', description: 'One small step before bed.', duration: 'Go at your pace', Icon: MoonStars, tone: 'rose' },
  { id: 'move', title: 'Move', description: 'An easy seated or standing break.', duration: '30 seconds or 2 minutes', Icon: PersonSimple, tone: 'gold' },
]

const RESET_MODES = {
  ground: {
    label: 'I feel scattered',
    detail: 'Notice what is around you.',
    steps: [
      'Feel your feet on the floor, or notice what is supporting you.',
      'Look around. Can you spot three colors?',
      'Find one sound nearby. No need to change it.',
      'What is one small thing you would like to do next?',
    ],
  },
  settle: {
    label: 'I need a quiet moment',
    detail: 'Pause without needing to fix anything.',
    steps: [
      'Let your hands rest somewhere comfortable.',
      'Notice one thing around you that feels steady.',
      'You can let this moment be just as it is.',
      'What would feel kind to do next?',
    ],
  },
  clear: {
    label: 'I want to clear my head',
    detail: 'Get one thought out of the mental loop.',
    steps: [
      'Name the thought that keeps coming back. A few words is enough.',
      'Is there one part you can leave for later, even just for tonight?',
      'Choose a tiny next step, or decide not to deal with it right now.',
      'That is enough. You do not need to solve the whole thing here.',
    ],
  },
  irritated: {
    label: 'I’m irritated or snappy',
    detail: 'Get a little space without forcing yourself to feel calm.',
    steps: [
      'You are annoyed. You do not have to pretend otherwise.',
      'If you can, take a little space from what is winding you up.',
      'Pick one: say what you need, step away, or leave it for later.',
      'Choose one small next move. It is okay if the feeling is still there.',
    ],
  },
}

const FOCUS_STARTERS = ['Homework', 'Getting ready', 'Replying to someone']

const WIND_DOWN_MODES = {
  thoughts: {
    label: 'My mind is still busy',
    steps: [
      { prompt: 'Get the thoughts out of your head for a moment.', detail: 'A few words are enough. You can also leave this blank.', note: true },
      { prompt: 'Which one of those things can wait until tomorrow?', detail: 'You do not have to solve it tonight.' },
      { prompt: 'Name one tiny next step for tomorrow, or let it wait.', detail: 'That is enough to put this down for now.' },
    ],
  },
  tomorrow: {
    label: 'I’m thinking about tomorrow',
    steps: [
      { prompt: 'What is one thing that would make your morning easier?', detail: 'Pick just one. The rest can wait.' },
      { prompt: 'If you can, put that one thing where you will see it.', detail: 'If you cannot do it now, simply naming it counts.' },
    ],
  },
  phone: {
    label: 'My phone is keeping me up',
    steps: [
      { prompt: 'Choose one small boundary for tonight.', detail: 'Try turning the phone face down or quieting nonessential notifications. Keep it nearby if you need to stay reachable.' },
      { prompt: 'When you are ready, let this be your last check for now.', detail: 'No need to get it perfect. You can change your mind.' },
    ],
  },
  restless: {
    label: 'I feel restless or uncomfortable',
    steps: [
      { prompt: 'Try one small comfort change.', detail: 'Shift position, adjust a pillow, or change a layer. Choose what works in your space.' },
      { prompt: 'If it feels good, loosen your shoulders or hands.', detail: 'Keep it gentle, and skip anything that does not feel right.' },
    ],
  },
  pause: {
    label: 'I’m not sure, I just need a pause',
    steps: [
      { prompt: 'Pick one small thing: get comfortable, take a sip of water, or sit quietly for a moment.', detail: 'Or skip this and call it enough for tonight.' },
      { prompt: 'You do not have to figure everything out right now.', detail: 'Close the app whenever you are ready.' },
    ],
  },
}

const MOVE_INTENTS = {
  loosen: { label: 'Loosen up', description: 'An easy stretch or change of position.' },
  wake: { label: 'Wake up a little', description: 'A little movement to break up sitting.' },
  pause: { label: 'Take a movement pause', description: 'A few gentle moves, at your pace.' },
}

const MOVEMENT = {
  loosen: {
    seated: ['Let your shoulders drop, then roll them gently a few times.', 'Open your hands wide, then let them soften. Repeat at your own pace.', 'Turn your head a little to one side, return to center, then switch if comfortable.'],
    standing: ['Let your shoulders drop, then roll them gently a few times.', 'Shift your weight from one foot to the other, only as far as feels steady.', 'Reach your arms forward or overhead if that feels comfortable.'],
  },
  wake: {
    seated: ['Press your feet gently into the floor, then let go.', 'Reach your arms forward, then bring them back. Keep the movement small.', 'March your feet in place, or tap your toes if you prefer.'],
    standing: ['Rise onto your toes and lower, or simply press your feet into the floor.', 'Reach your arms forward, then let them rest.', 'Take a few easy steps in place, or shift your weight gently.'],
  },
  pause: {
    seated: ['Unclench your hands, then rest them somewhere comfortable.', 'Make a small circle with each shoulder, one at a time.', 'Notice where your body is supported and settle into that position.'],
    standing: ['Let your arms hang comfortably by your sides.', 'Shift your weight gently, or stay still and feel both feet on the floor.', 'Let your shoulders soften. You can stop here.'],
  },
}

const QUIET_MOVES = {
  loosen: {
    seated: ['Let your shoulders drop. Make one slow, small shoulder circle.', 'Open your hands, then let them rest.', 'Ease your head a little to one side, return to center, and pause.'],
    standing: ['Let your shoulders drop. Make one slow, small shoulder circle.', 'Shift your weight just a little from side to side.', 'Reach your hands forward a little, then let them rest.'],
  },
  wake: {
    seated: ['Press your feet gently into the floor, then release.', 'Reach your hands forward, then bring them back.', 'Tap your toes quietly for a few moments.'],
    standing: ['Press both feet gently into the floor, then release.', 'Reach your hands forward, then let them rest.', 'Shift your weight subtly from one foot to the other.'],
  },
  pause: {
    seated: ['Let your hands rest somewhere comfortable.', 'Unclench your jaw and soften your shoulders if that feels okay.', 'Notice the support beneath you and pause.'],
    standing: ['Let your arms rest by your sides.', 'Feel both feet on the floor; no need to move.', 'Let your shoulders soften, or stay exactly as you are.'],
  },
}

const FAVORITES_KEY = 'maisie-wellbeing-favorites-v1'

function readFavorites() {
  if (typeof window === 'undefined') return []
  try {
    const saved = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((id) => TOOLS.some((tool) => tool.id === id)) : []
  } catch {
    return []
  }
}

function useWellbeingFavorites() {
  const [favorites, setFavorites] = useState(readFavorites)
  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]
    setFavorites(next)
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)) } catch { /* Favorite shortcuts are optional. */ }
  }
  return { favorites, toggleFavorite }
}

function ToolLink({ tool, favorite, onToggleFavorite }) {
  const Icon = tool.Icon
  return (
    <div className={`wellbeing-tool-row wellbeing-tool-row--${tool.tone}`}>
      <Link className="wellbeing-tool" to={`/learn/tools/${tool.id}`}>
        <span className="wellbeing-tool__icon" aria-hidden="true"><Icon size={23} weight="duotone" /></span>
        <span className="wellbeing-tool__copy"><strong>{tool.title}</strong><small>{tool.description}</small></span>
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
      <button className="wellbeing-favorite" type="button" aria-label={`${favorite ? 'Remove' : 'Add'} ${tool.title} ${favorite ? 'from' : 'to'} go-to tools`} aria-pressed={favorite} onClick={() => onToggleFavorite(tool.id)}>
        <Star size={19} weight={favorite ? 'fill' : 'regular'} aria-hidden="true" />
      </button>
    </div>
  )
}

export function WellbeingHome() {
  const { favorites, toggleFavorite } = useWellbeingFavorites()
  const favoriteTools = TOOLS.filter((tool) => favorites.includes(tool.id))
  const otherTools = TOOLS.filter((tool) => !favorites.includes(tool.id))
  const renderTool = (tool) => <ToolLink key={tool.id} tool={tool} favorite={favorites.includes(tool.id)} onToggleFavorite={toggleFavorite} />

  return (
    <div className="screen screen--pad-bottom wellbeing-screen">
      <TopBar title="Wellbeing" onBack={false} />
      <p className="wellbeing-intro">Small tools for whatever today brings.</p>

      {favoriteTools.length > 0 && <section aria-labelledby="wellbeing-favorites-title">
        <div className="wellbeing-section-heading">
          <h2 id="wellbeing-favorites-title">Your go-tos</h2>
          <span>Saved on this device</span>
        </div>
        <div className="wellbeing-tool-list">{favoriteTools.map(renderTool)}</div>
      </section>}

      {otherTools.length > 0 && <section className="wellbeing-all-tools" aria-labelledby="wellbeing-tools-title">
        <div className="wellbeing-section-heading">
          <h2 id="wellbeing-tools-title">{favoriteTools.length ? 'Explore tools' : 'Tools'}</h2>
          <span>Short and optional</span>
        </div>
        <div className="wellbeing-tool-list">
          {otherTools.map(renderTool)}
        </div>
      </section>}

      {favoriteTools.length > 0 && <p className="wellbeing-device-note">Go-to choices are saved on this device. They are not health data.</p>}

      <Link to="/learn/library" className="wellbeing-library-link">
        <span className="wellbeing-library-link__icon" aria-hidden="true"><BookOpenText size={22} weight="duotone" /></span>
        <span><strong>Learn library</strong><small>Browse health guides and saved articles.</small></span>
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
    </div>
  )
}

function useCountdown(initialSeconds) {
  const [duration, setDuration] = useState(initialSeconds)
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!running) return undefined
    if (seconds <= 0) {
      setRunning(false)
      setComplete(true)
      return undefined
    }
    const timeout = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [running, seconds])

  function reset(nextDuration = duration) {
    setRunning(false)
    setComplete(false)
    setDuration(nextDuration)
    setSeconds(nextDuration)
  }

  return { seconds, running, complete, setRunning, reset, duration }
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function TimerControls({ timer, startLabel = 'Start', disabled = false }) {
  return (
    <div className="wellbeing-timer-controls">
      <button type="button" className="btn btn--primary" disabled={disabled} onClick={() => {
        if (timer.complete) timer.reset()
        timer.setRunning(!timer.running || timer.complete)
      }}>
        {timer.running ? <><Pause size={18} weight="fill" /> Pause</> : <><Play size={18} weight="fill" /> {timer.complete ? 'Start again' : startLabel}</>}
      </button>
      {(timer.running || timer.complete || timer.seconds !== timer.duration) && (
        <button type="button" className="btn btn--ghost" onClick={() => timer.reset()}>
          <ArrowLeft size={18} /> Restart
        </button>
      )}
    </div>
  )
}

function TimerReadout({ seconds, label }) {
  return <output className="wellbeing-timer" aria-live="off" aria-label={`${label}: ${formatTime(seconds)} remaining`}>{formatTime(seconds)}</output>
}

function ActivityProgress({ value, max, label }) {
  return (
    <div className="wellbeing-progress" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax={max} aria-valuenow={value}>
      <span style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

function DidThisHelp() {
  const [answer, setAnswer] = useState('')
  return (
    <section className="wellbeing-feedback" aria-label="Optional tool feedback">
      <p>Did this help?</p>
      <div>
        {['A little', 'Not today', 'Skip'].map((option) => (
          <button key={option} type="button" aria-pressed={answer === option} onClick={() => setAnswer(option)}>{option}</button>
        ))}
      </div>
      {answer && <small>{answer === 'Skip' ? 'No problem.' : 'Thanks for letting us know. This is not added to your health log.'}</small>}
    </section>
  )
}

function ResetTool() {
  const timer = useCountdown(60)
  const [need, setNeed] = useState('')
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [repeated, setRepeated] = useState(false)
  const [finished, setFinished] = useState(false)
  const selectedMode = RESET_MODES[need]
  const steps = selectedMode?.steps || []
  const complete = finished || timer.complete

  function finish() {
    setFinished(true)
    timer.setRunning(false)
  }

  return (
    <>
      {!started ? <>
        <div className="wellbeing-setup-heading"><h2 className="wellbeing-reset-question">What would help right now?</h2><span>About 1 minute · stop whenever</span></div>
        <div className="wellbeing-reset-needs" role="group" aria-label="Choose a reset">
          {Object.entries(RESET_MODES).map(([id, mode]) => (
            <button key={id} type="button" aria-pressed={need === id} onClick={() => setNeed(id)}><strong>{mode.label}</strong><small>{mode.detail}</small></button>
          ))}
        </div>
        <button type="button" className="btn btn--primary wellbeing-reset-start" disabled={!need} onClick={() => { setStepIndex(0); setRepeated(false); setFinished(false); timer.reset(); setStarted(true) }}>Start reset</button>
        <p className="wellbeing-reset-footnote">No need to get it right. Skip or stop any time.</p>
      </> : complete ? <>
        <div className="wellbeing-reset-done" role="status">
          <span>Done for now</span>
          <p>Hope that gave you a little room to breathe. You can leave it there.</p>
        </div>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStarted(false); setNeed(''); setStepIndex(0); setFinished(false); timer.reset() }}>Choose another pause</button>
        <DidThisHelp />
      </> : <>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStarted(false); setNeed(''); timer.reset() }}>‹ Change pause</button>
        <div className="wellbeing-reset-progress">
          <span>{selectedMode.label}</span>
          <span>Step {stepIndex + 1} of {steps.length}</span>
        </div>
        <ActivityProgress value={stepIndex + 1} max={steps.length} label="Reset steps" />
        <div className="wellbeing-reset-prompt" key={`${need}-${stepIndex}`} aria-live="polite">
          <FlowerLotus size={24} weight="duotone" aria-hidden="true" />
          <p>{steps[stepIndex]}</p>
        </div>
        {repeated && <p className="wellbeing-repeat-note" role="status">Take your time. You can stay with this one.</p>}
        <div className="wellbeing-reset-actions">
          <button type="button" className="wellbeing-reset-repeat" onClick={() => setRepeated(true)}><ArrowCounterClockwise size={17} /> Repeat</button>
          <button type="button" className="btn btn--primary" onClick={() => {
            if (stepIndex === steps.length - 1) finish()
            else { setStepIndex((step) => step + 1); setRepeated(false) }
          }}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
        <div className="wellbeing-reset-timer">
          <span><Timer size={18} /> Optional timer</span>
          <TimerReadout seconds={timer.seconds} label="Reset timer" />
          <button type="button" aria-label={timer.running ? 'Pause timer' : timer.complete ? 'Restart timer' : 'Start timer'} onClick={() => {
            if (timer.complete) timer.reset()
            timer.setRunning(!timer.running || timer.complete)
          }}>{timer.running ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>
        </div>
      </>}
    </>
  )
}

function FocusTool() {
  const [task, setTask] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [started, setStarted] = useState(false)
  const [distraction, setDistraction] = useState('')
  const [parked, setParked] = useState([])
  const [outcome, setOutcome] = useState('')
  const [finishedEarly, setFinishedEarly] = useState(false)
  const timer = useCountdown(minutes * 60)
  const durations = [5, 10, 15]
  const complete = started && (timer.complete || finishedEarly)

  function finishEarly() {
    timer.setRunning(false)
    setFinishedEarly(true)
  }

  return (
    <>
      {!started ? <>
        <div className="wellbeing-setup-heading"><h2 className="wellbeing-reset-question">What would you like to start?</h2><span>5-15 minutes · stop whenever</span></div>
        <p className="wellbeing-tool-intro">Pick one thing, or leave it blank and decide as you go.</p>
        <label className="wellbeing-input-label" htmlFor="focus-task">Your focus <span>(optional)</span></label>
        <input id="focus-task" className="input" value={task} onChange={(event) => setTask(event.target.value)} maxLength={100} placeholder="One small task" />
        <div className="wellbeing-focus-starters" role="group" aria-label="Quick focus ideas">
          {FOCUS_STARTERS.map((starter) => <button key={starter} type="button" aria-pressed={task === starter} onClick={() => setTask(starter)}>{starter}</button>)}
        </div>
        <div className="wellbeing-duration" role="group" aria-label="Focus session length">
          {durations.map((duration) => (
            <button key={duration} type="button" aria-pressed={minutes === duration} onClick={() => { setMinutes(duration); setOutcome(''); setFinishedEarly(false); timer.reset(duration * 60) }}>
              {duration} min
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary wellbeing-reset-start" onClick={() => { setOutcome(''); setFinishedEarly(false); timer.reset(minutes * 60); setStarted(true); timer.setRunning(true) }}>Start focus</button>
        <p className="wellbeing-reset-footnote">You can pause or stop whenever you need.</p>
      </> : complete ? <>
        {!outcome ? <>
          <div className="wellbeing-reset-done" role="status">
            <span>{timer.complete ? 'Time is up' : 'Session finished'}</span>
            <p>{task.trim() ? `You made some space for ${task.trim()}.` : 'You made some space for one thing.'}</p>
          </div>
          <div className="wellbeing-next-choice" role="group" aria-label="Choose what to do next">
            <p>What feels right now?</p>
            <button type="button" className="btn btn--ghost" onClick={() => setOutcome('break')}>Take a break</button>
            <button type="button" className="btn btn--ghost" onClick={() => { setFinishedEarly(false); timer.reset(minutes * 60); timer.setRunning(true) }}>Another session</button>
            <button type="button" className="btn btn--primary" onClick={() => setOutcome('done')}>Done</button>
          </div>
        </> : <><p className="wellbeing-finish-note" role="status">{outcome === 'break' ? 'Take the break you need.' : 'Nice work showing up for yourself.'}</p><DidThisHelp /></>}
      </> : <>
        <button type="button" className="wellbeing-reset-change" onClick={() => { timer.setRunning(false); setStarted(false); timer.reset(minutes * 60) }}>‹ Change setup</button>
        <div className="wellbeing-focus-active">
          <span>One thing at a time</span>
          <p>{task.trim() || 'A few minutes for yourself.'}</p>
        </div>
        <ActivityProgress value={timer.duration - timer.seconds} max={timer.duration} label="Focus session progress" />
        <TimerReadout seconds={timer.seconds} label="Focus timer" />
        <TimerControls timer={timer} startLabel="Resume focus" />
        <button type="button" className="wellbeing-text-action" onClick={finishEarly}>Finish session</button>
        <details className="wellbeing-park-distraction">
          <summary>Something else on your mind?</summary>
          <label className="wellbeing-input-label" htmlFor="focus-distraction">Jot it down for later <span>(optional)</span></label>
          <div className="wellbeing-park-distraction__row">
            <input id="focus-distraction" className="input" value={distraction} onChange={(event) => setDistraction(event.target.value)} maxLength={100} placeholder="A quick note" />
            <button type="button" className="btn btn--ghost" disabled={!distraction.trim()} onClick={() => { setParked((items) => [...items, distraction.trim()]); setDistraction('') }}>Save note</button>
          </div>
          {parked.length > 0 && <ul>{parked.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
        </details>
      </>}
    </>
  )
}

function WindDownTool() {
  const [choice, setChoice] = useState('')
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [note, setNote] = useState('')
  const mode = WIND_DOWN_MODES[choice]
  const steps = mode?.steps || []
  const complete = finished

  function finish() {
    setFinished(true)
    setNote('')
  }

  function advance() {
    if (stepIndex === steps.length - 1) finish()
    else setStepIndex((step) => step + 1)
  }

  return (
    <>
      {!started && !complete ? <>
        <div className="wellbeing-setup-heading"><h2 className="wellbeing-reset-question">What would make tonight easier?</h2><span>Choose one small step</span></div>
        <p className="wellbeing-tool-intro">Pick the closest fit. You can stop after the first step.</p>
        <div className="wellbeing-winddown-choices" role="group" aria-label="Choose what is on your mind">
          {Object.entries(WIND_DOWN_MODES).map(([id, item]) => (
            <button key={id} type="button" aria-pressed={choice === id} onClick={() => { setChoice(id); setNote('') }}>{item.label}</button>
          ))}
        </div>
        <button type="button" className="btn btn--primary wellbeing-reset-start" disabled={!mode} onClick={() => { setStepIndex(0); setFinished(false); setStarted(true) }}>Continue</button>
        <p className="wellbeing-reset-footnote">No need to fall asleep on a schedule. Skip anything that does not fit.</p>
      </> : !complete ? <>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStarted(false); setStepIndex(0); setNote('') }}>‹ Change what’s up</button>
        <div className="wellbeing-reset-progress"><span>{mode.label}</span><span>Step {stepIndex + 1} of {steps.length}</span></div>
        <ActivityProgress value={stepIndex + 1} max={steps.length} label="Wind-down activity progress" />
        <div className="wellbeing-reset-prompt" key={`${choice}-${stepIndex}`} aria-live="polite">
          <MoonStars size={24} weight="duotone" aria-hidden="true" />
          <p>{steps[stepIndex].prompt}</p>
        </div>
        <p className="wellbeing-winddown-detail">{steps[stepIndex].detail}</p>
        {steps[stepIndex].note && <div className="wellbeing-winddown-note">
          <label className="wellbeing-input-label" htmlFor="winddown-note">A few words <span>(optional)</span></label>
          <textarea id="winddown-note" className="input" rows="3" value={note} onChange={(event) => setNote(event.target.value)} maxLength={400} placeholder="Write it down, or just think it through." />
          <small>This note stays here temporarily. It is not added to your health log.</small>
        </div>}
        <div className="wellbeing-reset-actions">
          <button type="button" className="wellbeing-reset-repeat" onClick={finish}>Skip, I’m done</button>
          <button type="button" className="btn btn--primary" onClick={advance}>{stepIndex === steps.length - 1 ? 'Done for tonight' : 'Next'}</button>
        </div>
      </> : <>
        <div className="wellbeing-reset-done" role="status"><span>That is enough for now</span><p>You can leave the rest for another time. No need to force sleep.</p></div>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStarted(false); setFinished(false); setChoice(''); setStepIndex(0) }}>Choose something else</button>
        <DidThisHelp />
      </>}
    </>
  )
}

function MoveTool() {
  const [intent, setIntent] = useState('')
  const [setupReady, setSetupReady] = useState(false)
  const [position, setPosition] = useState('seated')
  const [quiet, setQuiet] = useState(false)
  const [duration, setDuration] = useState(30)
  const [started, setStarted] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const timer = useCountdown(30)
  const routine = (quiet ? QUIET_MOVES : MOVEMENT)[intent]?.[position] || []
  const steps = duration === 30 ? routine.slice(0, 1) : routine
  const complete = finished

  function finish() {
    setFinished(true)
    timer.setRunning(false)
  }

  return (
    <>
      {!setupReady ? <>
        <div className="wellbeing-setup-heading"><h2 className="wellbeing-reset-question">What kind of break sounds good?</h2><span>30 seconds or 2 minutes</span></div>
        <p className="wellbeing-tool-intro">No workout, outfit, or equipment needed. Choose a direction; you can change it later.</p>
        <div className="wellbeing-move-goals" role="group" aria-label="Choose a movement break">
          {Object.entries(MOVE_INTENTS).map(([id, item]) => (
            <button key={id} type="button" aria-pressed={intent === id} onClick={() => setIntent(id)}>
              <strong>{item.label}</strong><small>{item.description}</small>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--primary wellbeing-reset-start" disabled={!intent} onClick={() => setSetupReady(true)}>Continue</button>
        <p className="wellbeing-reset-footnote">No check-in needed. Just pick what suits you.</p>
      </> : !started ? <>
        <button type="button" className="wellbeing-reset-change" onClick={() => setSetupReady(false)}>‹ Change goal</button>
        <div className="wellbeing-setup-heading"><h2 className="wellbeing-reset-question">Make it fit your space.</h2><span>Choose what feels doable</span></div>
        <p className="wellbeing-tool-intro">Choose what feels doable right now.</p>
        <div className="wellbeing-move-settings">
          <div>
            <span className="wellbeing-setting-label">Position</span>
            <div className="wellbeing-duration wellbeing-position" role="group" aria-label="Movement position">
              {['seated', 'standing'].map((value) => <button key={value} type="button" aria-pressed={position === value} onClick={() => setPosition(value)}>{value === 'seated' ? 'Seated' : 'Standing'}</button>)}
            </div>
          </div>
          <div>
            <span className="wellbeing-setting-label">Time</span>
            <div className="wellbeing-duration" role="group" aria-label="Movement break length">
              {[30, 120].map((value) => <button key={value} type="button" aria-pressed={duration === value} onClick={() => setDuration(value)}>{value === 30 ? '30 sec' : '2 min'}</button>)}
            </div>
          </div>
          <button className="wellbeing-move-quiet" type="button" aria-pressed={quiet} onClick={() => setQuiet((value) => !value)}>
            <span><strong>Keep it low-key</strong><small>Quiet, small movements for a shared space.</small></span>
            <span className="wellbeing-move-quiet__state" aria-hidden="true">{quiet ? 'On' : 'Off'}</span>
          </button>
        </div>
        <button type="button" className="btn btn--primary wellbeing-reset-start" onClick={() => { setStepIndex(0); setFinished(false); timer.reset(duration); setStarted(true) }}>Start {MOVE_INTENTS[intent].label.toLowerCase()}</button>
        <p className="wellbeing-reset-footnote">Skip anything that does not feel comfortable.</p>
      </> : !complete ? <>
        <button type="button" className="wellbeing-reset-change" onClick={() => { timer.setRunning(false); setStarted(false); timer.reset(duration) }}>‹ Change setup</button>
        <div className="wellbeing-reset-progress"><span>{MOVE_INTENTS[intent].label} · {position === 'seated' ? 'Seated' : 'Standing'}{quiet ? ' · Low-key' : ''}</span><span>Move {stepIndex + 1} of {steps.length}</span></div>
        <ActivityProgress value={stepIndex + 1} max={steps.length} label="Movement steps" />
        <div className="wellbeing-reset-prompt" key={`${position}-${stepIndex}`} aria-live="polite"><PersonSimple size={24} weight="duotone" aria-hidden="true" /><p>{steps[stepIndex]}</p></div>
        <p className="wellbeing-winddown-detail">Keep the movement easy. You can pause or skip at any time.</p>
        <div className="wellbeing-step-controls">
          <button type="button" className="btn btn--ghost" onClick={() => {
            if (stepIndex === steps.length - 1) finish()
            else setStepIndex((step) => step + 1)
          }}>Skip</button>
          <button type="button" className="btn btn--primary" onClick={() => {
            if (stepIndex === steps.length - 1) finish()
            else setStepIndex((step) => step + 1)
          }}>{stepIndex === steps.length - 1 ? 'Finish' : 'Next move'}</button>
        </div>
        <div className="wellbeing-reset-timer">
          <span><Timer size={18} /> Optional pace timer</span>
          <TimerReadout seconds={timer.seconds} label="Movement timer" />
          <button type="button" aria-label={timer.running ? 'Pause timer' : timer.complete ? 'Restart timer' : 'Start timer'} onClick={() => {
            if (timer.complete) timer.reset()
            timer.setRunning(!timer.running || timer.complete)
          }}>{timer.running ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>
        </div>
      </> : <>
        <div className="wellbeing-reset-done" role="status"><span>That was your movement pause</span><p>You can try a different goal or setup next time.</p></div>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStepIndex(0); setFinished(false); setStarted(false); timer.reset(duration) }}>Try this setup again</button>
        <button type="button" className="wellbeing-reset-change" onClick={() => { setStepIndex(0); setFinished(false); setStarted(false); setSetupReady(false); setIntent(''); timer.reset(30) }}>Choose a different break</button>
        <DidThisHelp />
      </>}
    </>
  )
}

export function WellbeingTool() {
  const { tool: toolId } = useParams()
  const tool = useMemo(() => TOOLS.find((item) => item.id === toolId), [toolId])
  const { favorites, toggleFavorite } = useWellbeingFavorites()
  if (!tool) return <div className="screen"><TopBar title="Wellbeing" /><p>This tool is not available.</p><Link to="/learn">Back to Wellbeing</Link></div>

  const Icon = tool.Icon
  const favorite = favorites.includes(tool.id)
  const Activity = {
    reset: ResetTool,
    focus: FocusTool,
    'wind-down': WindDownTool,
    move: MoveTool,
  }[tool.id]
  return (
    <div className={`screen screen--pad-bottom wellbeing-screen wellbeing-tool-screen wellbeing-tool-screen--${tool.tone}`}>
      <TopBar title="Wellbeing" />
      <div className={`wellbeing-tool-heading wellbeing-tool-heading--${tool.tone}`}>
        <span aria-hidden="true"><Icon size={25} weight="duotone" /></span>
        <div className="wellbeing-tool-heading__copy"><h1>{tool.title}</h1><small>{tool.duration}</small></div>
        <button className="wellbeing-detail-favorite" type="button" aria-label={`${favorite ? 'Remove' : 'Add'} ${tool.title} ${favorite ? 'from' : 'to'} go-to tools`} title={favorite ? 'Remove from go-to tools' : 'Save as a go-to'} aria-pressed={favorite} onClick={() => toggleFavorite(tool.id)}>
          <Star size={20} weight={favorite ? 'fill' : 'regular'} aria-hidden="true" />
        </button>
      </div>
      <Activity />
      <Link className="wellbeing-back-link" to="/learn"><ArrowLeft size={17} /> All wellbeing tools</Link>
    </div>
  )
}
