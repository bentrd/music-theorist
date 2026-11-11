import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Drawer } from '@base-ui/react/drawer';
import LiquidGlass from 'liquid-glass-react';
import { ArrowDownToLine, ArrowRight, AudioLines, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Compass, Flame, Headphones, Home, KeyboardMusic, Layers3, ListMusic, Music2, Play, Settings2, Sparkles, Target, Timer, Trophy, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { units, type Lesson, type Unit } from './data/curriculum';
import { completeLesson, initialProgress, loadProgress, parseProgress, recordPractice, saveProgress, todayKey, type Progress } from './lib/progress';
import { generateChordQuestion, generateIntervalQuestion } from './lib/theory';
const LessonRunner = lazy(() => import('./components/LessonRunner').then(m=>({default:m.LessonRunner})));
const NoteSprint = lazy(() => import('./components/LessonRunner').then(m=>({default:m.NoteSprint})));
const CircleOfFifths = lazy(() => import('./components/Tools').then(m=>({default:m.CircleOfFifths})));
const Glossary = lazy(() => import('./components/Tools').then(m=>({default:m.Glossary})));
const Playground = lazy(() => import('./components/Tools').then(m=>({default:m.Playground})));
import { stopAudio } from './lib/audio';

type Page = 'learn' | 'practice' | 'circle' | 'compose' | 'glossary';
type Sheet = 'course' | 'settings' | 'progress' | null;
const navItems = [
  { id: 'learn', label: 'Learn', icon: Home },
  { id: 'practice', label: 'Practice', icon: AudioLines },
  { id: 'circle', label: 'Circle of fifths', icon: Compass },
  { id: 'compose', label: 'Compose', icon: KeyboardMusic },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
] as const;
const allLessons = () => units.flatMap(unit => unit.lessons);
function shuffled<T,>(items:T[]):T[] {
  const copy=[...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}

function Mark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark ${small ? 'small' : ''}`} aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M9 23v-7a5 5 0 0 1 10 0v11a5 5 0 0 0 10 0V11" /></svg></span>;
}

function MusicArtwork() {
  return <div className="music-art" aria-hidden="true">
    <svg className="orbit-art" viewBox="0 0 430 330" fill="none">
      <defs>
        <linearGradient id="orb" x1="140" y1="35" x2="300" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity=".94"/><stop offset=".46" stopColor="#c7baf7" stopOpacity=".25"/><stop offset="1" stopColor="#8671d0" stopOpacity=".65"/></linearGradient>
        <linearGradient id="note" x1="185" y1="82" x2="245" y2="208"><stop stopColor="#a28bea"/><stop offset="1" stopColor="#6750b5"/></linearGradient>
        <linearGradient id="key" x1="38" y1="196" x2="191" y2="307"><stop stopColor="white"/><stop offset="1" stopColor="#ddd7ee"/></linearGradient>
        <radialGradient id="shadow"><stop stopColor="#8572b0" stopOpacity=".3"/><stop offset="1" stopColor="#8572b0" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="238" cy="268" rx="157" ry="37" fill="url(#shadow)"/>
      <ellipse cx="228" cy="157" rx="182" ry="68" transform="rotate(-28 228 157)" stroke="#a395c9" strokeOpacity=".25"/>
      <ellipse cx="228" cy="157" rx="161" ry="107" transform="rotate(32 228 157)" stroke="#a395c9" strokeOpacity=".18"/>
      <circle cx="236" cy="141" r="99" fill="url(#orb)" stroke="white" strokeOpacity=".9" strokeWidth="1.5"/>
      <path d="M166 95c13-22 35-33 59-35" stroke="white" strokeWidth="5" strokeLinecap="round" opacity=".8"/>
      <path d="M221 103v90c0 11-9 20-23 20-13 0-20-7-18-16 2-11 14-19 29-17v-74l62-17v86c0 11-10 20-24 20-12 0-20-7-18-16 2-10 14-19 30-17v-42z" fill="url(#note)"/>
      <g transform="translate(58 210) rotate(-19)"><rect width="155" height="76" rx="12" fill="#b4a5d5"/><rect y="-5" width="155" height="72" rx="11" fill="url(#key)" stroke="white" strokeWidth="2"/>{[22,44,66,88,110,132].map(x=><path key={x} d={`M${x} -3v68`} stroke="#c1b9d3" strokeWidth="1.4"/>)}{[16,38,82,104,126].map(x=><rect key={x} x={x} y="-4" width="13" height="40" rx="3" fill="#49405f"/>)}</g>
      <g transform="translate(335 214) rotate(16)"><rect width="57" height="57" rx="17" fill="#d8eeab" stroke="#f4ffe1" strokeWidth="2"/><path d="M18 29l8 8 14-18" stroke="#708d40" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></g>
      <circle cx="350" cy="75" r="13" fill="#bfa9ee"/><circle cx="350" cy="71" r="8" fill="#d6c6f5"/>
      <circle cx="96" cy="145" r="7" fill="#b7d596"/>
      <path d="M316 16v11m-5-5h10M110 60v10m-5-5h10M400 159v9m-4-4h8" stroke="#9d8dc3" strokeWidth="2" strokeLinecap="round"/>
    </svg>
    <div className="art-glass"><LiquidGlass displacementScale={38} blurAmount={0.07} saturation={125} aberrationIntensity={1.5} cornerRadius={18} padding="12px 17px" overLight><span className="art-glass-label"><span className="green-dot"/> C major <span className="art-glass-notes">C E G</span></span></LiquidGlass></div>
    <span className="art-note tiny-note">♯</span>
  </div>;
}

function UnitIcon({ unit, size = 22 }: { unit: Unit; size?: number }) {
  const icons = [Music2, Layers3, KeyboardMusic, Layers3, Compass, ListMusic, AudioLines, Sparkles, Headphones, Music2, Compass, KeyboardMusic];
  const Icon = icons[units.indexOf(unit) % icons.length];
  return <Icon size={size}/>;
}

export default function App() {
  const [page, setPage] = useState<Page>('learn');
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [storageOk, setStorageOk] = useState(true);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [track, setTrack] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(units[0]?.id ?? null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [sprint, setSprint] = useState(false);
  const [clef, setClef] = useState<'treble'|'bass'|'both'>('treble');
  const [resetArmed, setResetArmed] = useState(false);
  const [toast, setToast] = useState('');
  const headingRef = useRef<HTMLElement>(null);
  const lessons = allLessons();
  const nextLesson = lessons.find(item => !progress.completedLessons.includes(item.id)) ?? lessons[0];
  const dailyXp = progress.dailyXp[todayKey()] ?? 0;
  const goalPercent = Math.min(100, dailyXp / progress.dailyGoal * 100);

  useEffect(() => { setStorageOk(saveProgress(progress)); }, [progress]);
  useEffect(() => { if (!toast) return; const timer=setTimeout(()=>setToast(''),4000); return ()=>clearTimeout(timer); }, [toast]);
  useEffect(() => { stopAudio(); window.scrollTo({top:0,behavior:'instant'}); }, [page]);

  const navigate = (next: Page) => { setPage(next); setSheet(null); };
  const startLesson = (item:Lesson) => { stopAudio(); setSheet(null); setLesson({...item,questions:item.questions.map(q=>({...q,choices:shuffled(q.choices)}))}); };
  const finishLesson = (correct:number,total:number) => {
    if (lesson) {
      setProgress(p=>lesson.id.startsWith('practice-') ? recordPractice(p,correct,total) : completeLesson(p,lesson.id,correct,total));
      setToast(correct / total >= .8 ? 'Nice work. Your progress is saved.' : 'Good practice. Try again to master this lesson.');
    }
    setLesson(null);
    stopAudio();
  };
  const drill = (kind:'interval'|'chord'|'review') => {
    const reviewed = lessons.filter(l=>progress.completedLessons.includes(l.id) || (progress.lessonScores[l.id] ?? 100) < 80);
    const reviewPool = (reviewed.length ? reviewed : lessons.slice(0,2)).flatMap(l=>l.questions);
    const questions = kind==='review' ? shuffled(reviewPool).slice(0,8) : Array.from({length:8},()=>kind==='interval'?generateIntervalQuestion():generateChordQuestion());
    startLesson({id:`practice-${kind}`,title:kind==='interval'?'Hear the distance':kind==='chord'?'Name that chord':'Keep it fresh',description:'A short practice session.',concept:kind==='interval'?'Listen to the space between two notes. Replay as often as you like.':kind==='chord'?'Hear the notes together and identify the chord quality.':'Revisit the building blocks. A little recall makes the learning stick.',tip:'Use headphones for the clearest sound.',type:kind,questions});
  };
  const exportProgress = () => {
    const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`cadence-progress-${todayKey()}.json`;link.click();URL.revokeObjectURL(url);
    setToast('Progress backup downloaded.');
  };

  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <aside className="sidebar">
      <button className="brand" onClick={()=>navigate('learn')} aria-label="Cadence home"><Mark/><span>cadence<span className="brand-period">.</span></span></button>
      <div className="sidebar-caption">FIND YOUR MUSICAL FLOW</div>
      <nav className="main-nav" aria-label="Main navigation">{navItems.map(({id,label,icon:Icon})=><button key={id} className={`nav-item ${page===id?'active':''}`} onClick={()=>navigate(id)} aria-current={page===id?'page':undefined}><Icon size={21} strokeWidth={1.8}/><span>{label}</span>{page===id&&<span className="nav-active-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note"><span className="little-sparkle">✧</span><p>Great music starts<br/>with a little curiosity.</p><span className="note-dots">· · ·</span></div>
        <button className="nav-item settings-nav" onClick={()=>{setSheet('settings');setResetArmed(false);}}><Settings2 size={20}/><span>Settings</span></button>
        <span className="sidebar-foot">Made for your next masterpiece.</span>
      </div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="topbar-label"><span className="desktop-label">Your musical journey</span><span className="mobile-brand"><Mark small/>cadence.</span><ChevronRight size={13}/><span className="topbar-current">{navItems.find(item=>item.id===page)?.label}</span></div><div className="topbar-stats"><button className="stat-chip streak-chip" onClick={()=>setSheet('progress')} aria-label={`${progress.streak} day streak. View progress`}><Flame size={19}/><b>{progress.streak}</b><span>day streak</span></button><button className="stat-chip xp-chip" onClick={()=>setSheet('progress')} aria-label={`${progress.xp} XP. View progress`}><Zap size={18} fill="currentColor"/><b>{progress.xp}</b><span>XP</span></button><button className="avatar" onClick={()=>setSheet('settings')} aria-label="Open your settings"><Music2 size={19}/></button></div></header>
      <main id="main" className="main-content" ref={headingRef}>
        {!storageOk&&<div className="storage-warning" role="status">Your browser is blocking saved progress. Allow local storage to keep your learning.</div>}
        {page==='learn'&&<>
          <div className="welcome-line"><span>LET’S MAKE SOME MUSIC</span><span className="welcome-date">One good habit. Endless possibilities.</span></div>
          <section className="hero">
            <div className="hero-copy"><span className="eyebrow"><span/>A LITTLE PRACTICE. A LOT OF POSSIBILITY.</span><h1>Find your<br/>musical flow<span>.</span></h1><p>From your first chord to your next masterpiece.<br className="hero-break"/> Learn the harmony behind the music.</p><div className="hero-actions"><button className="primary-button" onClick={()=>startLesson(nextLesson)}>{progress.completedLessons.length?'Keep learning':'Let’s play'}<ArrowRight size={17}/></button><span className="time-note"><Timer size={14}/>3–5 min a day</span></div></div>
            <MusicArtwork/>
            <span className="hero-bottom-label">LESS SCROLLING. MORE COMPOSING.</span>
          </section>
          <div className="dashboard-grid"><div className="path-section">
            <div className="section-heading"><div><span className="eyebrow subtle">ONE NOTE AT A TIME</span><h2>Your learning path</h2></div><button className="text-button" onClick={()=>setSheet('course')}>View course<ChevronRight size={15}/></button></div>
            <div className="track-tabs" role="tablist" aria-label="Learning track">{['Building blocks','Harmonic language','Composition'].map((name,index)=><button key={name} role="tab" aria-selected={track===index} className={track===index?'selected':''} onClick={()=>{setTrack(index);setExpanded(units[index===0?0:index===1?4:9]?.id??null);}}>{name}</button>)}</div>
            <div className="unit-list">{units.filter((_,i)=>track===0?i<4:track===1?i>=4&&i<9:i>=9).map(unit=>{
              const index=units.indexOf(unit), completed=unit.lessons.filter(l=>progress.completedLessons.includes(l.id)).length;
              return <section key={unit.id} className={`unit-card ${expanded===unit.id?'expanded':''}`} style={{'--unit-color':unit.color} as CSSProperties}>
                <button className="unit-heading" aria-expanded={expanded===unit.id} onClick={()=>setExpanded(expanded===unit.id?null:unit.id)}><span className="unit-number">{String(index+1).padStart(2,'0')}</span><span className="unit-icon"><UnitIcon unit={unit}/></span><span className="unit-title"><strong>{unit.title}</strong><span>{unit.subtitle}</span></span><span className="unit-complete">{completed}/{unit.lessons.length}</span><ChevronDown size={17} className="unit-chevron"/></button>
                {expanded===unit.id&&<div className="lesson-path">{unit.lessons.map((item,i)=>{const done=progress.completedLessons.includes(item.id),current=item.id===nextLesson.id;return <div className="lesson-node" key={item.id}><button className={`lesson-circle ${done?'done':current?'current':''}`} onClick={()=>startLesson(item)} aria-label={`${item.title}${done?', completed':''}`}><span>{done?<Check size={23}/>:current?<Play size={23} fill="currentColor"/>:<UnitIcon unit={unit} size={21}/>}</span>{current&&<span className="start-tag">START HERE</span>}</button><span className="lesson-name">{item.title}</span><span className="lesson-meta">{done?'Completed':`${i+1} of ${unit.lessons.length}`}</span></div>;})}</div>}
              </section>;
            })}</div>
            <div className="path-footer"><span className="footer-star">✧</span><span>Build understanding. Then break the rules.</span></div>
          </div><aside className="right-rail">
            <section className="goal-card"><div className="card-topline"><span className="tiny-icon"><Target size={17}/></span><h3>Your daily goal</h3><button className="icon-button" aria-label="Edit daily goal" onClick={()=>setSheet('settings')}><Settings2 size={15}/></button></div><div className="daily-goal-body"><div className="goal-ring" style={{'--goal':`${goalPercent}%`} as CSSProperties}><span><b>{dailyXp}</b><small>/ {progress.dailyGoal} XP</small></span></div><div><strong>{goalPercent>=100?'You did it!':'A little, every day.'}</strong><p>{goalPercent>=100?'Your future self says thanks.':'Your next level starts with showing up.'}</p></div></div><div className="week-days">{Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)+i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const done=(progress.dailyXp[key]??0)>0;return <span key={i} className={`${done?'practiced':''} ${key===todayKey()?'today':''}`}><span>{['M','T','W','T','F','S','S'][i]}</span><i>{done?<Check size={12}/>:key===todayKey()?<span/>:null}</i></span>;})}</div></section>
            <button className="sprint-card" onClick={()=>{setClef('treble');setSprint(true);}}><span className="sprint-top"><span className="sprint-label"><Zap size={13} fill="currentColor"/> QUICK PLAY</span><ArrowRight size={18}/></span><h3>Beat the staff.</h3><p>60 seconds. How many notes<br/>can you name?</p><div className="sprint-illustration"><span className="sprint-card-lines">{[0,1,2,3,4].map(i=><i key={i}/>)}</span><span className="sprint-card-note">♪</span><span className="sprint-card-clock"><Timer size={15}/> 00:60</span></div><span className="sprint-card-bottom">Play Note Sprint<ChevronRight size={15}/></span></button>
            <button className="explore-card" onClick={()=>navigate('circle')}><div className="mini-circle">{['C','G','D','A','E','B','F♯','D♭','A♭','E♭','B♭','F'].map((note,i)=><span key={note} style={{transform:`rotate(${i*30}deg) translateY(-27px) rotate(${-i*30}deg)`}}>{note}</span>)}<Music2 size={18}/></div><div><span className="eyebrow subtle">CONNECT THE DOTS</span><h3>Meet the circle.</h3><p>Your shortcut to harmony.</p></div><ChevronRight size={18}/></button>
            <div className="local-note"><span className="local-dot"/>Your progress stays on this device.</div>
          </aside></div>
        </>}
        {page==='practice'&&<><div className="page-heading"><span className="eyebrow subtle">MAKE IT SECOND NATURE</span><h1>A little repetition.<br/><span>A lot more instinct.</span></h1><p>Train your eyes. Trust your ears. Feel the harmony.</p></div><div className="practice-grid"><section className="practice-feature"><span className="practice-icon"><Zap size={29}/></span><span className="eyebrow">THE 60-SECOND CHALLENGE</span><h2>Beat the staff.</h2><p>Read notes faster, one personal best at a time.</p><div className="clef-options" aria-label="Choose clef">{(['treble','bass','both'] as const).map(value=><button key={value} className={clef===value?'active':''} onClick={()=>setClef(value)}>{value==='both'?'Both clefs':`${value[0].toUpperCase()+value.slice(1)} clef`}</button>)}</div><button className="primary-button" onClick={()=>setSprint(true)}>Start Note Sprint<ArrowRight size={17}/></button><span className="personal-best"><Trophy size={15}/> Best streak: {progress.bestNoteStreak}</span></section>{[{kind:'interval' as const,title:'Hear the distance.',sub:'Ear training',text:'From a minor second to an octave. Make every interval familiar.',icon:Headphones,color:'peach'},{kind:'chord' as const,title:'Name that chord.',sub:'Chord recognition',text:'Major, minor, diminished. Learn to hear the character.',icon:Layers3,color:'lilac'},{kind:'review' as const,title:'Keep it fresh.',sub:'Mixed review',text:'Bring what you’ve learned back into the mix.',icon:Sparkles,color:'green'}].map(({kind,title,sub,text,icon:Icon,color})=><button key={kind} className={`practice-card ${color}`} onClick={()=>drill(kind)}><span className="practice-small-icon"><Icon size={24}/></span><span className="eyebrow subtle">{sub}</span><h2>{title}</h2><p>{text}</p><span className="practice-card-footer">8 questions<ArrowRight size={19}/></span></button>)}</div><div className="practice-tip"><Headphones size={19}/><p>Headphones on. Distractions off. You’ve got this.</p>{!progress.sound&&<button className="text-button" onClick={()=>setProgress(p=>({...p,sound:true}))}>Enable sound<Volume2 size={15}/></button>}</div></>}
        {page==='circle'&&<Suspense fallback={<div className="loading-panel" role="status">Finding your flow…</div>}><CircleOfFifths sound={progress.sound}/></Suspense>}
        {page==='compose'&&<Suspense fallback={<div className="loading-panel" role="status">Finding your flow…</div>}><Playground sound={progress.sound}/></Suspense>}
        {page==='glossary'&&<Suspense fallback={<div className="loading-panel" role="status">Finding your flow…</div>}><Glossary/></Suspense>}
        <footer className="app-footer"><span>cadence<span>·</span> Find your musical flow.</span><button onClick={()=>setSheet('settings')}><CircleHelp size={14}/>Your learning, your pace</button></footer>
      </main>
    </div>

    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(({id,label,icon:Icon})=><button key={id} aria-current={page===id?'page':undefined} className={page===id?'active':''} onClick={()=>navigate(id)}><Icon size={21}/><span>{id==='circle'?'Circle':label}</span></button>)}</nav>

    <Drawer.Root open={sheet!==null} onOpenChange={open=>{if(!open){setSheet(null);setResetArmed(false);}}}>
      <Drawer.Portal><Drawer.Backdrop className="sheet-backdrop"/><Drawer.Viewport className="sheet-viewport"><Drawer.Popup className="bottom-sheet"><div className="sheet-handle"/><Drawer.Content className="sheet-content"><div className="sheet-header"><div><span className="eyebrow subtle">YOUR MUSICAL JOURNEY</span><Drawer.Title>{sheet==='course'?'The whole picture.':sheet==='settings'?'Make yourself at home.':'Look how far you’ve come.'}</Drawer.Title></div><Drawer.Close className="icon-button" aria-label="Close sheet"><X size={21}/></Drawer.Close></div><Drawer.Description className="sheet-description">{sheet==='course'?'From your first chord to a language you can compose in. Jump in wherever you’re curious.':sheet==='settings'?'A few things to make your practice feel right.':'Small steps add up. Keep showing up.'}</Drawer.Description>
        {sheet==='course'&&<div className="course-list">{units.map((unit,i)=><button key={unit.id} onClick={()=>{setTrack(i<4?0:i<9?1:2);setExpanded(unit.id);setPage('learn');setSheet(null);setTimeout(()=>document.getElementById('main')?.scrollIntoView({behavior:'smooth'}),100);}}><span className="course-index">{String(i+1).padStart(2,'0')}</span><span><strong>{unit.title}</strong><small>{unit.lessons.map(l=>l.title).join(' · ')}</small></span><span className="course-count">{unit.lessons.filter(l=>progress.completedLessons.includes(l.id)).length}/{unit.lessons.length}</span><ChevronRight size={17}/></button>)}</div>}
        {sheet==='settings'&&<div className="settings-content"><div className="setting-row"><div><strong>Sound</strong><small>Hear notes, intervals, and chords.</small></div><button role="switch" aria-checked={progress.sound} aria-label="Sound" className={`toggle ${progress.sound?'on':''}`} onClick={()=>{setProgress(p=>({...p,sound:!p.sound}));stopAudio();}}>{progress.sound?<Volume2 size={16}/>:<VolumeX size={16}/>}<span/></button></div><div className="setting-row goal-setting"><div><strong>Daily goal</strong><small>Consistency beats intensity.</small></div><div className="goal-options">{[20,40,60].map(goal=><button key={goal} className={progress.dailyGoal===goal?'active':''} onClick={()=>setProgress(p=>({...p,dailyGoal:goal}))}>{goal} XP</button>)}</div></div><div className="setting-row"><div><strong>Your progress</strong><small>Stored locally. Take a backup with you.</small></div><button className="secondary-button" onClick={exportProgress}><ArrowDownToLine size={16}/>Export</button></div><div className="setting-row"><div><strong>Restore a backup</strong><small>Import a Cadence progress file.</small></div><label className="secondary-button file-button">Import<input type="file" accept="application/json,.json" onChange={async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw new Error();const merged=parseProgress(JSON.parse(await file.text()));if(!merged)throw new Error();merged.completedLessons=merged.completedLessons.filter(id=>lessons.some(l=>l.id===id));setProgress(merged);setToast('Your progress is restored. Welcome back.');}catch{setToast('That file isn’t a valid Cadence backup.');}event.target.value='';}}/></label></div><div className="setting-row reset-row"><div><strong>Fresh start</strong><small>{resetArmed?'This clears your XP, streak, and lessons.':'Reset your learning progress.'}</small></div><button className="text-button danger" onClick={()=>{if(resetArmed){setProgress(initialProgress());setResetArmed(false);setToast('A fresh start. Your next note awaits.');}else setResetArmed(true);}}>{resetArmed?'Confirm reset':'Reset progress'}</button></div><p className="settings-fineprint">No account. No ads. Just you and the harmony.<br/>Clearing browser data also clears local progress.</p></div>}
        {sheet==='progress'&&<div className="progress-content"><div className="progress-summary"><div><Flame size={26}/><strong>{progress.streak}</strong><span>day streak</span></div><div><Zap size={26}/><strong>{progress.xp}</strong><span>total XP</span></div><div><Trophy size={26}/><strong>{progress.completedLessons.length}</strong><span>lessons mastered</span></div></div><div className="mastery-bar"><div><strong>Your course progress</strong><span>{progress.completedLessons.length} / {lessons.length}</span></div><div className="progress-track"><span style={{width:`${progress.completedLessons.length/lessons.length*100}%`}}/></div><p>Score at least 80% to master a lesson. Every attempt builds skill.</p></div><button className="primary-button" onClick={()=>startLesson(nextLesson)}>Keep the music going<ArrowRight size={16}/></button></div>}
      </Drawer.Content></Drawer.Popup></Drawer.Viewport></Drawer.Portal>
    </Drawer.Root>
    <Suspense fallback={<div className="exercise-loading" role="status">Getting the music ready…</div>}>
    {lesson&&<LessonRunner key={lesson.id} lesson={lesson} onClose={()=>{setLesson(null);stopAudio();}} onComplete={finishLesson} sound={progress.sound} previouslyMastered={progress.completedLessons.includes(lesson.id)} practice={lesson.id.startsWith('practice-')} onEnableSound={()=>setProgress(p=>({...p,sound:true}))}/>}
    {sprint&&<NoteSprint onClose={()=>{setSprint(false);stopAudio();}} onComplete={(correct,total,best)=>{setProgress(p=>recordPractice(p,correct,total,best));setSprint(false);setToast('Sprint complete. Your personal best is saved.');}} sound={progress.sound} clef={clef}/>}
    </Suspense>
    {toast&&<div className="toast" role="status"><Check size={16}/>{toast}</div>}
  </>;
}
