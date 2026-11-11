import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, Flame, Headphones, Lightbulb, Music2, Sparkles, Trophy, Volume2, X, Zap } from 'lucide-react';
import type { Lesson, Question } from '../data/curriculum';
import { generateNoteQuestion } from '../lib/theory';
import { playNotes, playSequence, stopAudio } from '../lib/audio';
import { HarmonyScore, Staff } from './Music';

function useExerciseDialog(onClose: () => void) {
  const container = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    container.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(container.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (!container.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', trap);
      stopAudio();
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return container;
}

function AnswerChoices({ question, selected, revealed, onSelect }: {
  question: Question;
  selected: string | null;
  revealed: boolean;
  onSelect: (choice: string) => void;
}) {
  return <div className="lesson-choices" role="group" aria-label="Answer choices">
    {question.choices.map((choice, index) => {
      const correct = revealed && choice === question.answer;
      const wrong = revealed && selected === choice && choice !== question.answer;
      return <button type="button" key={choice} disabled={revealed} aria-pressed={selected === choice} className={`lesson-choice ${selected === choice ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''}`} onClick={() => onSelect(choice)}>
        <span className="choice-number">{index + 1}</span><span>{choice}</span>{correct && <Check size={18} />}{wrong && <X size={18} />}
      </button>;
    })}
  </div>;
}

export function LessonRunner({ lesson, onClose, onComplete, sound, previouslyMastered = false, practice = false, onEnableSound }: {
  lesson: Lesson;
  onClose: () => void;
  onComplete: (correct: number, total: number) => void;
  sound: boolean;
  previouslyMastered?: boolean;
  practice?: boolean;
  onEnableSound?: () => void;
}) {
  const [phase, setPhase] = useState<'learn' | 'exercise' | 'summary'>('learn');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [listening, setListening] = useState(false);
  const [finished, setFinished] = useState(false);
  const submitted = useRef(false);
  const completed = useRef(false);
  const listeningToken = useRef(0);
  const container = useExerciseDialog(onClose);
  const question = lesson.questions[index];
  const total = lesson.questions.length;
  const isCorrect = selected === question?.answer;
  const earnedXp = practice ? score * 5 : score * 10 + (score / total >= 0.8 && !previouslyMastered ? 20 : 0);

  useEffect(() => { container.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }, [phase, index]);
  useEffect(() => () => { listeningToken.current += 1; }, []);

  const checkAnswer = useCallback(() => {
    if (selected === null || revealed || submitted.current || !question) return;
    submitted.current = true;
    stopAudio();
    listeningToken.current += 1;
    setListening(false);
    setRevealed(true);
    if (selected === question.answer) {
      setScore((value) => value + 1);
      if (sound) void playNotes([72, 76, 79], 0.24);
    } else if (sound) void playNotes([55, 62], 0.18);
  }, [selected, revealed, question, sound]);

  const nextQuestion = useCallback(() => {
    if (!revealed) return;
    stopAudio();
    listeningToken.current += 1;
    setListening(false);
    if (index + 1 === total) setPhase('summary');
    else { setIndex((value) => value + 1); setSelected(null); setRevealed(false); submitted.current = false; }
  }, [index, revealed, total]);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setFinished(true);
    onComplete(score, total);
  }, [onComplete, score, total]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (phase === 'exercise' && !revealed && /^[1-9]$/.test(event.key)) {
        const answer = question.choices[Number(event.key) - 1];
        if (answer !== undefined) { event.preventDefault(); setSelected(answer); }
      }
      const button = event.target instanceof HTMLElement ? event.target.closest('button') : null;
      if (event.key !== 'Enter' || (button && !button.classList.contains('lesson-choice'))) return;
      event.preventDefault();
      if (phase === 'learn') setPhase('exercise');
      else if (phase === 'exercise') { if (revealed) nextQuestion(); else checkAnswer(); }
      else finish();
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [phase, revealed, question, nextQuestion, checkAnswer, finish]);

  const listen = async () => {
    if (!question.audio || listening || !sound) return;
    const token = ++listeningToken.current;
    setListening(true);
    await playSequence(question.audio, 0.6);
    if (token === listeningToken.current) setListening(false);
  };

  if (!question) return <div className="exercise-overlay" ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Lesson"><button className="exercise-close" onClick={onClose}><X size={20} /> Close</button><p>This lesson has no exercises yet.</p></div>;

  return <div className="exercise-overlay" ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="lesson-title">
    <header className="exercise-header">
      <button type="button" className="exercise-back" aria-label="Leave lesson" onClick={onClose}><X size={22} /></button>
      <div className="exercise-progress" role="progressbar" aria-label="Lesson progress" aria-valuenow={phase === 'summary' ? total : phase === 'exercise' ? index + (revealed ? 1 : 0) : 0} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${phase === 'summary' ? 100 : (index + (revealed ? 1 : 0)) / total * 100}%` }} /></div>
      <span className="exercise-count">{phase === 'learn' ? `${total} questions` : phase === 'summary' ? 'Complete' : `${index + 1} / ${total}`}</span>
    </header>

    {phase === 'learn' && <div className="lesson-intro exercise-content">
      <div className="lesson-intro-icon"><Music2 size={38} strokeWidth={1.6} /><span className="intro-spark"><Sparkles size={20} /></span></div>
      <span className="exercise-eyebrow">A little theory. A lot of possibility.</span>
      <h1 id="lesson-title" tabIndex={-1}>{lesson.title}</h1>
      <p className="lesson-concept">{lesson.concept}</p>
      <div className="lesson-tip"><Lightbulb size={20} /><p>{lesson.tip}</p></div>
      <div className="intro-meta"><span><Clock3 size={16} /> 3–5 minutes</span><span><Zap size={16} /> {practice ? 'Every answer counts' : '80% to master'}</span></div>
      <button type="button" className="lesson-primary" onClick={() => setPhase('exercise')}>Let's play <ArrowRight size={19} /></button>
      <span className="keyboard-hint">Use 1–4 to choose · Enter to check · Esc to leave</span>
    </div>}

    {phase === 'exercise' && <div className="exercise-content lesson-question-content" key={question.id}>
      <span className="exercise-eyebrow">{question.score ? 'Read the harmony' : question.staff ? 'Read the music' : question.audio ? 'Trust your ears' : 'Make the connection'}</span>
      <h1 id="lesson-title" className="question-title" tabIndex={-1}>{question.prompt}</h1>
      {question.score && <div className="question-harmony-score"><HarmonyScore chords={question.score.chords} keyLabel={question.score.key} /></div>}
      {question.staff && <div className="question-staff"><Staff notes={question.staff.notes} clef={question.staff.clef} /></div>}
      {question.audio && <div className="question-audio"><button type="button" className={`listen-button ${listening ? 'is-playing' : ''}`} onClick={() => void listen()} disabled={listening || !sound} aria-label={listening ? 'Playing audio' : 'Play question audio'}><Volume2 size={29} /><span>{listening ? 'Listening…' : 'Play sound'}</span></button>{!sound && <div className="audio-muted-note">Sound is off. {onEnableSound ? <button type="button" className="enable-audio-button" onClick={onEnableSound}>Enable sound <Volume2 size={13} /></button> : 'Turn it on in Settings for listening exercises.'}</div>}</div>}
      <AnswerChoices question={question} selected={selected} revealed={revealed} onSelect={setSelected} />
      <div className={`lesson-feedback ${revealed ? isCorrect ? 'is-correct' : 'is-wrong' : ''}`} aria-live="polite">
        {revealed && <><div className="feedback-icon">{isCorrect ? <Check size={21} /> : <Lightbulb size={21} />}</div><div><strong>{isCorrect ? ['You got it.', 'Right on the note.', 'Beautifully done.'][index % 3] : `The answer is ${question.answer}.`}</strong><p>{question.explanation}</p></div></>}
      </div>
      <div className="question-actions"><span className="keyboard-hint">{revealed ? 'Keep the idea. Take it to the next one.' : 'Choose an answer, then check it.'}</span><button type="button" className="lesson-primary" disabled={!revealed && selected === null} onClick={revealed ? nextQuestion : checkAnswer}>{revealed ? index + 1 === total ? 'See results' : 'Continue' : 'Check answer'} <ArrowRight size={18} /></button></div>
    </div>}

    {phase === 'summary' && <div className="exercise-content lesson-summary">
      <div className="summary-trophy"><Trophy size={46} strokeWidth={1.5} /><span>✦</span><span>✦</span></div>
      <span className="exercise-eyebrow">One step closer to fluent</span>
      <h1 id="lesson-title" tabIndex={-1}>{score === total ? 'Perfect harmony.' : 'You made progress.'}</h1>
      <p>{score === total ? 'Every connection landed. Keep that momentum.' : score / total >= 0.8 || practice ? 'Every mistake is a connection getting stronger.' : 'Keep practicing. Score 80% to master this lesson.'}</p>
      <div className="summary-metrics"><div><Zap size={22} /><strong>{earnedXp}</strong><span>XP earned</span></div><div><Check size={22} /><strong>{Math.round(score / total * 100)}%</strong><span>Accuracy</span></div><div><Music2 size={22} /><strong>{score}/{total}</strong><span>Correct</span></div></div>
      <div className="summary-takeaway"><Lightbulb size={18} /><span>{lesson.tip}</span></div>
      <button type="button" className="lesson-primary" onClick={finish} disabled={finished}>Back to my path <ArrowRight size={19} /></button>
    </div>}
  </div>;
}

export function NoteSprint({ onClose, onComplete, sound, clef = 'treble' }: {
  onClose: () => void;
  onComplete: (correct: number, total: number, bestStreak: number) => void;
  sound: boolean;
  clef?: 'treble' | 'bass' | 'both';
}) {
  const makeQuestion = (selectedClef: 'treble' | 'bass' | 'both') => ({ ...generateNoteQuestion(selectedClef), choices: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] });
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const [question, setQuestion] = useState<Question>(() => makeQuestion(clef));
  const [seconds, setSeconds] = useState(60);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const remaining = useRef(60_000);
  const lastTick = useRef(0);
  const streakRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerLock = useRef(false);
  const completed = useRef(false);
  const container = useExerciseDialog(onClose);

  useEffect(() => { container.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }); }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    lastTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) {
        remaining.current = Math.max(0, remaining.current - (now - lastTick.current));
        setSeconds(Math.ceil(remaining.current / 1000));
        if (remaining.current <= 0) setPhase('done');
      }
      lastTick.current = now;
    }, 80);
    const visibility = () => { lastTick.current = performance.now(); setPaused(document.hidden); };
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [phase]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);
  useEffect(() => {
    if (phase !== 'done') return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    answerLock.current = true;
    stopAudio();
  }, [phase]);

  const choose = useCallback((choice: string) => {
    if (phase !== 'running' || answerLock.current || document.hidden || remaining.current <= 0) return;
    // Reject inputs at the deadline, even between the timer's visual updates.
    if (remaining.current - (performance.now() - lastTick.current) <= 0) {
      remaining.current = 0;
      setSeconds(0);
      setPhase('done');
      return;
    }
    answerLock.current = true;
    setAttempts((value) => value + 1);
    if (choice === question.answer) {
      setCorrect((value) => value + 1);
      const nextStreak = ++streakRef.current;
      setStreak(nextStreak);
      setBest((old) => Math.max(old, nextStreak));
      setFeedback('correct');
      if (sound && question.staff) void playNotes(question.staff.notes, 0.13);
    } else {
      streakRef.current = 0;
      setStreak(0);
      setFeedback('wrong');
    }
    advanceTimer.current = setTimeout(() => {
      setQuestion(makeQuestion(clef));
      setFeedback(null);
      answerLock.current = false;
    }, choice === question.answer ? 150 : 800);
  }, [phase, question, clef, sound]);

  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setFinished(true);
    onComplete(correct, attempts, best);
  }, [correct, attempts, best, onComplete]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (phase === 'running') {
        const letter = event.key.toUpperCase();
        const byLetter = /^[A-G]$/.test(letter) ? question.choices.find((choice) => choice === letter) : undefined;
        const byNumber = /^[1-9]$/.test(event.key) ? question.choices[Number(event.key) - 1] : undefined;
        if (byLetter || byNumber) { event.preventDefault(); choose((byLetter || byNumber)!); }
      }
      if (event.key === 'Enter' && !(event.target instanceof HTMLElement && event.target.closest('button'))) {
        if (phase === 'ready') { event.preventDefault(); setPhase('running'); }
        else if (phase === 'done') { event.preventDefault(); finish(); }
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [phase, question, choose, finish]);

  return <div className="exercise-overlay note-sprint" ref={container} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="sprint-title">
    <header className="exercise-header"><button type="button" className="exercise-back" aria-label="Leave note sprint" onClick={onClose}><X size={22} /></button><span className="sprint-header-label"><Zap size={18} /> Note sprint</span><span className={`sprint-timer ${seconds <= 10 ? 'is-urgent' : ''}`}><Clock3 size={18} /> {seconds}s</span></header>
    {phase === 'ready' && <div className="exercise-content lesson-intro">
      <div className="lesson-intro-icon sprint-intro-icon"><Zap size={42} strokeWidth={1.7} /></div>
      <span className="exercise-eyebrow">Small drill. Big difference.</span>
      <h1 id="sprint-title" tabIndex={-1}>See it. Name it. Repeat.</h1>
      <p className="lesson-concept">60 seconds to turn notes into second nature. {clef === 'both' ? 'Treble and bass clefs, mixed together.' : `${clef === 'bass' ? 'Bass' : 'Treble'} clef. One note at a time.`}</p>
      <div className="sprint-preview"><Staff notes={[clef === 'bass' ? 48 : 67]} clef={clef === 'bass' ? 'bass' : 'treble'} /></div>
      <button type="button" className="lesson-primary" onClick={() => setPhase('running')}>Start my 60 seconds <ArrowRight size={19} /></button>
      <span className="keyboard-hint">Tap an answer or type its letter · Pauses in the background</span>
    </div>}
    {phase === 'running' && <div className="exercise-content sprint-content">
      <div className="sprint-stats"><span><Check size={18} /><strong>{correct}</strong> correct</span><span className={streak >= 3 ? 'streak-hot' : ''}><Flame size={18} /><strong>{streak}</strong> streak</span></div>
      <span className="exercise-eyebrow">{question.staff?.clef === 'bass' ? 'Bass' : 'Treble'} clef</span><h1 id="sprint-title" tabIndex={-1}>Name that note.</h1>
      <div className={`sprint-staff ${feedback ? `feedback-${feedback}` : ''}`}><Staff notes={question.staff?.notes ?? [60]} clef={question.staff?.clef ?? 'treble'} /></div>
      <div className="sprint-note-choices" role="group" aria-label="Note names">{question.choices.map((choice) => <button type="button" key={choice} className={`sprint-note-button ${feedback && choice === question.answer ? 'is-correct' : ''}`} disabled={!!feedback} onClick={() => choose(choice)}>{choice}</button>)}</div>
      <div className="sprint-live-feedback" aria-live="polite">{feedback === 'wrong' ? <>This is <strong>{question.answer}</strong>. Keep going.</> : feedback === 'correct' ? <span className="sprint-correct"><Check size={16} /> Got it!</span> : paused ? 'Paused while you’re away.' : 'Build speed. Accuracy comes first.'}</div>
      <div className="sprint-time-track" aria-hidden="true"><span style={{ width: `${seconds / 60 * 100}%` }} /></div>
    </div>}
    {phase === 'done' && <div className="exercise-content lesson-summary">
      <div className="summary-trophy sprint-trophy"><Zap size={46} strokeWidth={1.5} /></div><span className="exercise-eyebrow">A minute well played</span><h1 id="sprint-title" tabIndex={-1}>{correct > 20 ? 'Lightning fingers.' : correct > 0 ? 'A little faster already.' : 'Your first step counts.'}</h1><p>{attempts ? 'Keep coming back. Recognition grows with repetition.' : 'Try naming a few notes on your next round.'}</p>
      <div className="summary-metrics"><div><Check size={22} /><strong>{correct}</strong><span>Notes read</span></div><div><Flame size={22} /><strong>{best}</strong><span>Best streak</span></div><div><Headphones size={22} /><strong>{attempts ? Math.round(correct / attempts * 100) : 0}%</strong><span>Accuracy</span></div></div>
      <button type="button" className="lesson-primary" onClick={finish} disabled={finished}>Save my session <ArrowRight size={19} /></button>
      <span className="keyboard-hint">{correct * 5} XP from correct notes</span>
    </div>}
  </div>;
}
