import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, CircleHelp, Headphones, Plus, RotateCcw, Search, Sparkles, Square, Volume2, X } from 'lucide-react';
import { glossary } from '../data/glossary';
import { Piano } from './Music';
import { playNotes, playSequence, stopAudio } from '../lib/audio';
import '../styles/tools.css';

type Mode = 'major' | 'minor';
type MusicalKey = { tonic: string; minor: string; notes: string[]; pc: number; minorPc: number; signature: string; accidentals: string };
const KEYS: MusicalKey[] = [
  { tonic: 'C', minor: 'A', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], pc: 0, minorPc: 9, signature: 'No sharps or flats', accidentals: '♮' },
  { tonic: 'G', minor: 'E', notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F♯'], pc: 7, minorPc: 4, signature: '1 sharp · F♯', accidentals: '♯' },
  { tonic: 'D', minor: 'B', notes: ['D', 'E', 'F♯', 'G', 'A', 'B', 'C♯'], pc: 2, minorPc: 11, signature: '2 sharps · F♯ C♯', accidentals: '♯♯' },
  { tonic: 'A', minor: 'F♯', notes: ['A', 'B', 'C♯', 'D', 'E', 'F♯', 'G♯'], pc: 9, minorPc: 6, signature: '3 sharps · F♯ C♯ G♯', accidentals: '♯♯♯' },
  { tonic: 'E', minor: 'C♯', notes: ['E', 'F♯', 'G♯', 'A', 'B', 'C♯', 'D♯'], pc: 4, minorPc: 1, signature: '4 sharps · F♯ C♯ G♯ D♯', accidentals: '♯♯♯♯' },
  { tonic: 'B', minor: 'G♯', notes: ['B', 'C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯'], pc: 11, minorPc: 8, signature: '5 sharps · F♯ C♯ G♯ D♯ A♯', accidentals: '5♯' },
  { tonic: 'F♯', minor: 'D♯', notes: ['F♯', 'G♯', 'A♯', 'B', 'C♯', 'D♯', 'E♯'], pc: 6, minorPc: 3, signature: '6 sharps · F♯ C♯ G♯ D♯ A♯ E♯', accidentals: '6♯' },
  { tonic: 'D♭', minor: 'B♭', notes: ['D♭', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'], pc: 1, minorPc: 10, signature: '5 flats · B♭ E♭ A♭ D♭ G♭', accidentals: '5♭' },
  { tonic: 'A♭', minor: 'F', notes: ['A♭', 'B♭', 'C', 'D♭', 'E♭', 'F', 'G'], pc: 8, minorPc: 5, signature: '4 flats · B♭ E♭ A♭ D♭', accidentals: '♭♭♭♭' },
  { tonic: 'E♭', minor: 'C', notes: ['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D'], pc: 3, minorPc: 0, signature: '3 flats · B♭ E♭ A♭', accidentals: '♭♭♭' },
  { tonic: 'B♭', minor: 'G', notes: ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'], pc: 10, minorPc: 7, signature: '2 flats · B♭ E♭', accidentals: '♭♭' },
  { tonic: 'F', minor: 'D', notes: ['F', 'G', 'A', 'B♭', 'C', 'D', 'E'], pc: 5, minorPc: 2, signature: '1 flat · B♭', accidentals: '♭' },
];
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_ROMANS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_ROMANS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', '°'];
const MINOR_QUALITIES = ['m', '°', '', 'm', 'm', '', ''];
const MAJOR_FUNCTIONS = [
  ['Tonic', 'Home. Stable and resolved.'],
  ['Predominant', 'Sets up V. Try ii–V–I.'],
  ['Tonic color', 'Shares two notes with I. A softer place to rest.'],
  ['Predominant', 'Opens the harmony and often leads to V.'],
  ['Dominant', 'Creates tension that wants to resolve to I.'],
  ['Tonic substitute', 'A minor home base. Try V–vi for a surprise.'],
  ['Dominant', 'Its leading tone and tritone pull strongly toward I.'],
];
const MINOR_FUNCTIONS = [
  ['Tonic', 'Home in a minor key.'],
  ['Predominant', 'Diminished tension that can prepare the dominant.'],
  ['Relative major', 'Opens a brighter window inside the minor key.'],
  ['Predominant', 'A dark, gentle departure from i.'],
  ['Minor dominant', 'A gentle pull home. Raise its third for a stronger major V.'],
  ['Submediant', 'Warm color, often followed by VII or iv.'],
  ['Subtonic', 'A whole step below home. Common in modal and electronic loops.'],
];

function scaleFor(key: MusicalKey, mode: Mode) {
  const names = mode === 'major' ? key.notes : [...key.notes.slice(5), ...key.notes.slice(0, 5)];
  const root = 48 + (mode === 'major' ? key.pc : key.minorPc);
  const steps = mode === 'major' ? MAJOR_STEPS : MINOR_STEPS;
  return { names, midi: steps.map(step => root + step), root, steps, romans: mode === 'major' ? MAJOR_ROMANS : MINOR_ROMANS, qualities: mode === 'major' ? MAJOR_QUALITIES : MINOR_QUALITIES };
}

function chordNotes(key: MusicalKey, mode: Mode, degree: number, inversion = 0): number[] {
  const scale = scaleFor(key, mode);
  const notes = [0, 2, 4].map(offset => {
    const index = degree + offset;
    return scale.midi[index % 7] + Math.floor(index / 7) * 12;
  });
  for (let i = 0; i < inversion; i++) notes.push(notes.shift()! + 12);
  return notes;
}

function polar(radius: number, degrees: number) {
  const radians = (degrees - 90) * Math.PI / 180;
  return [210 + radius * Math.cos(radians), 210 + radius * Math.sin(radians)];
}
function segment(inner: number, outer: number, center: number) {
  const start = center - 14.35;
  const end = center + 14.35;
  const a = polar(outer, start), b = polar(outer, end), c = polar(inner, end), d = polar(inner, start);
  return `M${a.join(',')} A${outer},${outer} 0 0 1 ${b.join(',')} L${c.join(',')} A${inner},${inner} 0 0 0 ${d.join(',')} Z`;
}

export function CircleOfFifths({ sound }: { sound: boolean }) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>('major');
  const [playing, setPlaying] = useState(false);
  const playbackId = useRef(0);
  const key = KEYS[selected];
  const scale = scaleFor(key, mode);
  const title = `${mode === 'major' ? key.tonic : key.minor} ${mode}`;
  useEffect(() => () => { playbackId.current++; stopAudio(); }, []);
  useEffect(() => { if (!sound) { playbackId.current++; stopAudio(); setPlaying(false); } }, [sound]);
  function select(index: number, nextMode: Mode) { playbackId.current++; stopAudio(); setPlaying(false); setSelected(index); setMode(nextMode); }
  async function hearScale() {
    if (!sound || playing) return;
    const id = ++playbackId.current;
    setPlaying(true);
    await playSequence([...scale.midi, scale.root + 12].map(note => [note + 12]), 0.29);
    if (id === playbackId.current) setPlaying(false);
  }
  return <div className="tools-view circle-view">
    <div className="tools-heading"><span className="tools-eyebrow">THE BIG PICTURE</span><h1>Everything is connected.</h1><p>Meet the map behind your music. Pick a key and explore.</p></div>
    <div className="circle-layout">
      <div className="circle-map-card">
        <div className="circle-map-label"><span><i />Major keys</span><span><i />Relative minor keys</span></div>
        <div className="circle-map-wrap"><svg className="circle-svg" viewBox="0 0 420 420" aria-label="Interactive circle of fifths">
          <circle cx="210" cy="210" r="204" fill="none" stroke="#e8e7f0" strokeDasharray="2 7" />
          {KEYS.map((item, i) => {
            const majorPoint = polar(169, i * 30), minorPoint = polar(113, i * 30);
            return <g key={item.tonic}>
              <g className={`circle-key circle-major ${selected === i && mode === 'major' ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected === i && mode === 'major'} aria-label={`${item.tonic} major`} onClick={() => select(i, 'major')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(i, 'major'); } }}>
                <path d={segment(141, 197, i * 30)} /><text x={majorPoint[0]} y={majorPoint[1]}>{item.tonic}</text>
              </g>
              <g className={`circle-key circle-minor ${selected === i && mode === 'minor' ? 'is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected === i && mode === 'minor'} aria-label={`${item.minor} minor`} onClick={() => select(i, 'minor')} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(i, 'minor'); } }}>
                <path d={segment(86, 138, i * 30)} /><text x={minorPoint[0]} y={minorPoint[1]}>{item.minor}m</text>
              </g>
            </g>;
          })}
          <text className="circle-center-note" x="210" y="200">{mode === 'major' ? key.tonic : key.minor}</text><text className="circle-center-mode" x="210" y="231">{mode === 'major' ? 'MAJOR' : 'MINOR'}</text>
        </svg></div>
        <div className="circle-directions"><span>← Add a flat</span><span>Add a sharp →</span></div>
        <p className="circle-map-footnote">Each step clockwise moves up a perfect fifth.</p>
      </div>
      <div className="circle-details">
        <div className="tools-panel circle-key-detail"><div className="circle-detail-top"><span className="tools-eyebrow">YOUR KEY</span><span className="circle-signature-badge">{key.accidentals}</span></div><h2>{title}</h2><p>{key.signature}</p><div className="circle-scale-notes">{scale.names.map((name, i) => <button key={name} className={i === 0 ? 'is-tonic' : ''} disabled={!sound} onClick={() => void playNotes([scale.midi[i] + 12], 0.45)} aria-label={`Play ${name}`}>{name}<small>{i + 1}</small></button>)}</div><button className="tools-play-button" onClick={() => void hearScale()} disabled={!sound || playing}><Volume2 size={17} />{!sound ? 'Sound is off' : playing ? 'Playing scale…' : 'Hear the scale'}</button><div className="circle-relative"><span>{mode === 'major' ? 'Relative minor' : 'Relative major'}</span><button onClick={() => select(selected, mode === 'major' ? 'minor' : 'major')}>{mode === 'major' ? `${key.minor} minor` : `${key.tonic} major`}<ArrowUpRight size={15} /></button></div></div>
        <div className="tools-panel circle-chords"><span className="tools-eyebrow">CHORDS THAT BELONG</span><div className="circle-chord-grid">{scale.names.map((name, i) => <button key={name} disabled={!sound} onClick={() => void playNotes(chordNotes(key, mode, i), 0.9)} aria-label={`Play ${name}${scale.qualities[i]} chord`}><strong>{name}{scale.qualities[i]}</strong><small>{scale.romans[i]}</small></button>)}</div><p>{mode === 'major' ? 'I feels like home. IV opens things up. V pulls you back.' : 'These are natural minor chords. Raise scale degree 7 to turn v into a stronger major V.'}</p></div>
      </div>
    </div>
    <div className="tools-tip"><CircleHelp size={19} /><p>Neighbors share six notes. That’s why moving to a nearby key often sounds so natural.</p></div>
  </div>;
}

type ChordSlot = { degree: number; inversion: number };
type LabState = { keyIndex: number; mode: Mode; slots: ChordSlot[] };
const LAB_STORAGE_KEY = 'cadence-composition-v1';
const DEFAULT_LAB: LabState = { keyIndex: 0, mode: 'major', slots: [0, 4, 5, 3].map(degree => ({ degree, inversion: 0 })) };
function loadLab(): LabState {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || 'null');
    if (typeof data !== 'object' || data === null) return DEFAULT_LAB;
    const candidate = data as Partial<LabState>;
    if (!Number.isInteger(candidate.keyIndex) || candidate.keyIndex! < 0 || candidate.keyIndex! > 11 || !['major', 'minor'].includes(candidate.mode || '') || !Array.isArray(candidate.slots) || candidate.slots.length < 4 || candidate.slots.length > 8 || !candidate.slots.every(slot => slot && Number.isInteger(slot.degree) && slot.degree >= 0 && slot.degree <= 6 && Number.isInteger(slot.inversion) && slot.inversion >= 0 && slot.inversion <= 2)) return DEFAULT_LAB;
    return candidate as LabState;
  } catch { return DEFAULT_LAB; }
}
function normalizeTempo(value: string) {
  const parsed = value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(200, Math.max(40, Math.round(parsed))) : 100;
}

export function Playground({ sound }: { sound: boolean }) {
  const [lab, setLab] = useState<LabState>(loadLab);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [playingSlot, setPlayingSlot] = useState(-1);
  const [tempo, setTempo] = useState('100');
  const [keyboardNote, setKeyboardNote] = useState<number | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const playbackId = useRef(0);
  const key = KEYS[lab.keyIndex];
  const scale = scaleFor(key, lab.mode);
  const currentChord = lab.slots[selectedSlot] || lab.slots[0];
  const displayChord = (playingSlot >= 0 ? lab.slots[playingSlot] : currentChord) || currentChord;
  const currentNotes = chordNotes(key, lab.mode, displayChord.degree, displayChord.inversion);
  const chordFunction = (lab.mode === 'major' ? MAJOR_FUNCTIONS : MINOR_FUNCTIONS)[displayChord.degree];
  const chordSpellings = [0, 2, 4].map(offset => scale.names[(displayChord.degree + offset) % 7]);
  useEffect(() => setKeyboardNote(null), [selectedSlot, currentChord.degree, currentChord.inversion, lab.keyIndex, lab.mode]);
  useEffect(() => {
    if (keyboardNote === null) return;
    const timer = window.setTimeout(() => setKeyboardNote(null), 500);
    return () => window.clearTimeout(timer);
  }, [keyboardNote]);
  useEffect(() => {
    try { localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(lab)); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
  }, [lab]);
  useEffect(() => () => { playbackId.current++; stopAudio(); }, []);
  useEffect(() => { if (!sound) { playbackId.current++; stopAudio(); setPlayingSlot(-1); } }, [sound]);
  function stop() { playbackId.current++; stopAudio(); setPlayingSlot(-1); }
  function setKey(keyIndex: number, mode = lab.mode) { stop(); setLab(previous => ({ ...previous, keyIndex, mode })); }
  function chooseChord(degree: number) {
    stop();
    setLab(previous => ({ ...previous, slots: previous.slots.map((slot, i) => i === selectedSlot ? { degree, inversion: 0 } : slot) }));
    if (sound) void playNotes(chordNotes(key, lab.mode, degree), 0.55);
  }
  function preset(degrees: number[]) { stop(); setSelectedSlot(0); setLab(previous => ({ ...previous, slots: degrees.map(degree => ({ degree, inversion: 0 })) })); }
  function moveSlot(index: number, direction: number) {
    const destination = index + direction;
    if (destination < 0 || destination >= lab.slots.length) return;
    stop();
    const next = [...lab.slots];
    [next[index], next[destination]] = [next[destination], next[index]];
    setSelectedSlot(destination); setLab(previous => ({ ...previous, slots: next }));
  }
  async function play() {
    if (!sound || playingSlot !== -1) return;
    const id = ++playbackId.current;
    const duration = 120 / normalizeTempo(tempo);
    for (let i = 0; i < lab.slots.length; i++) {
      if (id !== playbackId.current) return;
      setPlayingSlot(i);
      await playSequence([chordNotes(key, lab.mode, lab.slots[i].degree, lab.slots[i].inversion)], duration);
    }
    if (id === playbackId.current) setPlayingSlot(-1);
  }
  return <div className="tools-view lab-view">
    <div className="tools-heading"><span className="tools-eyebrow">THE COMPOSITION LAB</span><h1>Turn theory into a feeling.</h1><p>Build a progression. Hear what each chord does.</p></div>
    <div className="tools-panel lab-workbench">
      <div className="lab-toolbar"><div className="lab-key-controls"><label className="tools-select">Key<select aria-label="Composition key" value={lab.keyIndex} onChange={event => setKey(Number(event.target.value))}>{KEYS.map((item, i) => <option key={item.tonic} value={i}>{lab.mode === 'major' ? item.tonic : item.minor}</option>)}</select><ChevronDown size={14} /></label><div className="tools-segmented" aria-label="Scale mode">{(['major', 'minor'] as const).map(mode => <button key={mode} className={mode === lab.mode ? 'is-active' : ''} onClick={() => setKey(lab.keyIndex, mode)} aria-pressed={mode === lab.mode}>{mode}</button>)}</div></div><label className="lab-tempo"><input type="number" min={40} max={200} step={5} value={tempo} aria-label="Tempo in beats per minute" onChange={event => { stop(); setTempo(event.target.value); }} onBlur={() => setTempo(String(normalizeTempo(tempo)))} /><span>BPM</span></label></div>
      <div className="lab-section-label"><span>YOUR PROGRESSION</span><span>{lab.slots.length} chords · two beats each</span></div>
      <div className="lab-sequence">{lab.slots.map((slot, i) => <div key={i} className={`lab-slot ${selectedSlot === i ? 'is-selected' : ''} ${playingSlot === i ? 'is-playing' : ''}`}><button className="lab-slot-main" onClick={() => { setSelectedSlot(i); if (sound && playingSlot < 0) void playNotes(chordNotes(key, lab.mode, slot.degree, slot.inversion), 0.5); }} aria-label={`Select chord ${i + 1}, ${scale.names[slot.degree]}${scale.qualities[slot.degree]}`} aria-pressed={selectedSlot === i}><span className="lab-slot-number">{String(i + 1).padStart(2, '0')}</span><strong>{scale.names[slot.degree]}{scale.qualities[slot.degree]}</strong><span className="lab-slot-roman">{scale.romans[slot.degree]}{slot.inversion > 0 ? <small> · {slot.inversion === 1 ? '1st inv.' : '2nd inv.'}</small> : null}</span></button><div className="lab-slot-actions"><button aria-label={`Move chord ${i + 1} left`} disabled={i === 0} onClick={() => moveSlot(i, -1)}><ArrowLeft size={13} /></button><button aria-label={`Remove chord ${i + 1}`} disabled={lab.slots.length <= 4} onClick={() => { stop(); setSelectedSlot(Math.max(0, Math.min(selectedSlot, lab.slots.length - 2))); setLab(previous => ({ ...previous, slots: previous.slots.filter((_, j) => j !== i) })); }}><X size={13} /></button><button aria-label={`Move chord ${i + 1} right`} disabled={i === lab.slots.length - 1} onClick={() => moveSlot(i, 1)}><ArrowRight size={13} /></button></div></div>)}{lab.slots.length < 8 && <button className="lab-add" aria-label="Add a chord" onClick={() => { stop(); setSelectedSlot(lab.slots.length); setLab(previous => ({ ...previous, slots: [...previous.slots, { degree: 0, inversion: 0 }] })); }}><Plus size={22} /><span>Add</span></button>}</div>
      <div className="lab-playback"><button className={`tools-play-button ${playingSlot >= 0 ? 'is-playing' : ''}`} disabled={!sound} onClick={() => playingSlot >= 0 ? stop() : void play()}>{playingSlot >= 0 ? <Square size={16} fill="currentColor" /> : <Volume2 size={17} />}{!sound ? 'Sound is off' : playingSlot >= 0 ? 'Stop playback' : 'Play progression'}</button><button className="tools-text-button" onClick={() => preset([0, 4, 5, 3])}><RotateCcw size={15} />Reset</button></div>
      {!storageAvailable && <p className="lab-storage-message" role="status">Browser storage is unavailable. This progression will reset on refresh.</p>}
      <div className="lab-divider" />
      <div className="lab-palette-heading"><div><span className="tools-eyebrow">PICK A CHORD</span><p>Replaces chord {selectedSlot + 1}</p></div><label className="tools-select lab-inversion">Voicing<select aria-label="Chord inversion" value={currentChord.inversion} onChange={event => { stop(); const inversion = Number(event.target.value); setLab(previous => ({ ...previous, slots: previous.slots.map((slot, i) => i === selectedSlot ? { ...slot, inversion } : slot) })); if (sound) void playNotes(chordNotes(key, lab.mode, currentChord.degree, inversion), 0.65); }}><option value={0}>Root position</option><option value={1}>1st inversion</option><option value={2}>2nd inversion</option></select><ChevronDown size={14} /></label></div>
      <div className="lab-chord-palette">{scale.names.map((name, degree) => <button key={degree} className={degree === currentChord.degree ? 'is-active' : ''} onClick={() => chooseChord(degree)} aria-pressed={degree === currentChord.degree}><strong>{name}{scale.qualities[degree]}</strong><span>{scale.romans[degree]}</span></button>)}</div>
      <div className="lab-function-strip"><span className="lab-function-roman">{scale.romans[displayChord.degree]}</span><div><strong>{chordFunction[0]}</strong><p>{chordFunction[1]}</p></div><span className="lab-function-notes">{chordSpellings.join(' · ')}</span></div>
      <div className="lab-presets"><span><Sparkles size={14} />Try a shape</span><button onClick={() => preset([0, 3, 4, 0])}>{lab.mode === 'major' ? 'Classical · I–IV–V–I' : 'Minor · i–iv–v–i'}<ArrowUpRight size={13} /></button><button onClick={() => preset(lab.mode === 'major' ? [5, 3, 0, 4] : [0, 5, 2, 6])}>{lab.mode === 'major' ? 'Electronic · vi–IV–I–V' : 'Electronic · i–VI–III–VII'}<ArrowUpRight size={13} /></button></div>
    </div>
    <div className="tools-panel lab-keyboard-panel"><div className="lab-keyboard-heading"><div><span className="tools-eyebrow">FEEL THE NOTES</span><h2>{scale.names[displayChord.degree]}{scale.qualities[displayChord.degree]} <small>{displayChord.inversion === 0 ? 'root position' : `${displayChord.inversion === 1 ? 'first' : 'second'} inversion`}</small></h2></div><Headphones size={24} /></div><Piano startNote={48} octaves={4} activeNotes={keyboardNote === null ? currentNotes : [keyboardNote]} onPlay={midi => { setKeyboardNote(midi); if (sound) void playNotes([midi], 0.5); }} /><p className="lab-keyboard-caption">Tap the keys to improvise over your progression.</p></div>
    <div className="tools-tip"><CircleHelp size={19} /><p>{lab.mode === 'major' ? 'Roman numerals describe the chord’s job. Change key and the pattern still works.' : 'This palette uses natural minor. Classical minor often raises the seventh to create a major V.'}</p></div>
  </div>;
}

export function Glossary() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(glossary.map(entry => entry.category))];
  const search = query.trim().toLowerCase();
  const entries = glossary.filter(entry => (category === 'All' || entry.category === category) && (!search || `${entry.term} ${entry.definition} ${entry.example || ''}`.toLowerCase().includes(search)));
  return <div className="tools-view glossary-view"><div className="tools-heading"><span className="tools-eyebrow">SPEAK THE LANGUAGE</span><h1>Less jargon. More music.</h1><p>A pocket dictionary for the things musicians say.</p></div><div className="glossary-search"><Search size={20} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search music theory terms" placeholder="Try ‘diminished’ or ‘sidechain’…" />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={17} /></button>}<kbd>⌕</kbd></div><div className="glossary-categories" aria-label="Filter terms by category">{categories.map(item => <button key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</div><div className="glossary-results-heading"><span>{entries.length} {entries.length === 1 ? 'term' : 'terms'}{query ? ` for “${query}”` : ''}</span><span>A → Z</span></div><div className="glossary-grid">{[...entries].sort((a, b) => a.term.localeCompare(b.term)).map(entry => <article className="glossary-card" key={entry.term}><span className="glossary-card-category">{entry.category}</span><h2>{entry.term}</h2><p>{entry.definition}</p>{entry.example && <details><summary>Show example<Plus size={13} /></summary><div>{entry.example}</div></details>}</article>)}</div>{entries.length === 0 && <div className="glossary-empty"><Search size={30} /><h2>No terms found.</h2><p>Try a shorter search or another category.</p><button className="tools-play-button" onClick={() => { setCategory('All'); setQuery(''); }}>Show all terms</button></div>}</div>;
}
