import { playNotes } from '../lib/audio';
import '../styles/lesson.css';

const pitchNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const diatonicSteps = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

function pitch(midi: number) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: pitchNames[pc], octave, sharp: pitchNames[pc].includes('♯'), step: octave * 7 + diatonicSteps[pc] };
}

export function Staff({ notes, clef = 'treble', labels = false, className = '' }: {
  notes: number[];
  clef?: 'treble' | 'bass';
  labels?: boolean;
  className?: string;
}) {
  const bottomStep = clef === 'treble' ? 30 : 18; // E4 and G2.
  const positions = notes.map((midi, index) => ({
    ...pitch(midi), midi,
    x: notes.length === 1 ? 242 : 127 + index * Math.min(60, 250 / Math.max(1, notes.length - 1)),
    y: 118 - (pitch(midi).step - bottomStep) * 7,
  }));
  const minY = Math.min(0, ...positions.map((note) => note.y - 40));
  const maxY = Math.max(180, ...positions.map((note) => note.y + 38));
  return (
    <svg className={`music-staff ${className}`} viewBox={`0 ${minY} 440 ${maxY - minY}`} role="img" aria-label={`${clef} clef staff${labels ? `: ${positions.map((note) => `${note.name}${note.octave}`).join(', ')}` : ` with ${notes.length === 1 ? 'one note' : `${notes.length} notes`}`}`}>
      {[62, 76, 90, 104, 118].map((y) => <line key={y} x1="32" x2="408" y1={y} y2={y} className="staff-line" />)}
      <text x="42" y={clef === 'treble' ? 120 : 106} className={`staff-clef ${clef}`} aria-hidden="true">{clef === 'treble' ? '𝄞' : '𝄢'}</text>
      {positions.map((note, index) => {
        const ledgers: number[] = [];
        for (let y = 132; y <= note.y; y += 14) ledgers.push(y);
        for (let y = 48; y >= note.y; y -= 14) ledgers.push(y);
        const stemDown = note.y <= 90;
        return <g key={`${note.midi}-${index}`}>
          {ledgers.map((y) => <line key={y} x1={note.x - 17} x2={note.x + 17} y1={y} y2={y} className="staff-ledger" />)}
          {note.sharp && <text x={note.x - 29} y={note.y + 8} className="staff-accidental">♯</text>}
          <ellipse cx={note.x} cy={note.y} rx="10" ry="7" transform={`rotate(-18 ${note.x} ${note.y})`} className="staff-note" />
          <line x1={note.x + (stemDown ? -9 : 9)} x2={note.x + (stemDown ? -9 : 9)} y1={note.y} y2={note.y + (stemDown ? 42 : -42)} className="staff-stem" />
          {labels && <text x={note.x} y={Math.max(163, note.y + 60)} textAnchor="middle" className="staff-label">{note.name}<tspan className="staff-octave">{note.octave}</tspan></text>}
        </g>;
      })}
    </svg>
  );
}

/** A small score for reading harmony as shapes and progressions. One chord per bar. */
export function HarmonyScore({ chords, keyLabel, labels = [] }: {
  chords: number[][];
  keyLabel: string;
  labels?: string[];
}) {
  const count = Math.max(1, chords.length);
  const barWidth = count <= 2 ? 175 : 145;
  const start = 105;
  const width = start + count * barWidth + 28;
  const bottom = 136;
  const positions = chords.map((chord, bar) => {
    const notes = [...new Set(chord)].sort((a, b) => pitch(a).step - pitch(b).step || a - b).map((midi) => ({ ...pitch(midi), midi, y: bottom - (pitch(midi).step - 30) * 7, offset: 0 }));
    const stemDown = notes.length > 0 && notes.reduce((sum, note) => sum + note.y, 0) / notes.length <= 108;
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].step - notes[i - 1].step <= 1 && notes[i - 1].offset === 0) notes[i].offset = stemDown ? -18 : 18;
    }
    return { notes, stemDown, x: start + (bar + 0.5) * barWidth };
  });
  const allNotes = positions.flatMap((bar) => bar.notes);
  const minY = Math.min(0, ...allNotes.map((note) => note.y - 50));
  const labelsY = Math.max(196, ...allNotes.map((note) => note.y + 58));
  const height = labelsY + 22 - minY;
  return <svg className="harmony-score" viewBox={`0 ${minY} ${width} ${height}`} role="img" aria-label={`Score in ${keyLabel}, ${chords.length} bars. ${labels.length ? labels.join(', ') : 'Read the stacked notes in each bar.'}`}>
    <text x="30" y={minY + 25} className="score-key-label">{keyLabel}</text>
    {[80, 94, 108, 122, 136].map((y) => <line key={y} x1="27" x2={width - 27} y1={y} y2={y} className="staff-line" />)}
    <text x="37" y="138" className="staff-clef" aria-hidden="true">𝄞</text>
    {positions.map((bar, index) => {
      const ledgerYs = new Set<number>();
      for (const note of bar.notes) {
        for (let y = 150; y <= note.y; y += 14) ledgerYs.add(y);
        for (let y = 66; y >= note.y; y -= 14) ledgerYs.add(y);
      }
      const left = Math.min(0, ...bar.notes.map((note) => note.offset));
      const right = Math.max(0, ...bar.notes.map((note) => note.offset));
      const accidentalColumns: number[] = [];
      const minNoteY = Math.min(...bar.notes.map((note) => note.y));
      const maxNoteY = Math.max(...bar.notes.map((note) => note.y));
      const stemX = bar.x + (bar.stemDown ? -9 : 9);
      return <g key={index}>
        <text x={start + index * barWidth + 12} y="63" className="score-bar-number">{index + 1}</text>
        {[...ledgerYs].map((y) => <line key={y} x1={bar.x + left - 17} x2={bar.x + right + 17} y1={y} y2={y} className="staff-ledger" />)}
        {bar.notes.map((note) => {
          let accidentalColumn = 0;
          if (note.sharp) {
            const open = accidentalColumns.findIndex((y) => Math.abs(y - note.y) >= 25);
            accidentalColumn = open < 0 ? accidentalColumns.length : open;
            accidentalColumns[accidentalColumn] = note.y;
          }
          return <g key={note.midi}>
            {note.sharp && <text x={bar.x + left - 28 - accidentalColumn * 14} y={note.y + 8} className="staff-accidental">♯</text>}
            <ellipse cx={bar.x + note.offset} cy={note.y} rx="10" ry="7" transform={`rotate(-18 ${bar.x + note.offset} ${note.y})`} className="staff-note" />
          </g>;
        })}
        {bar.notes.length > 0 && <line x1={stemX} x2={stemX} y1={bar.stemDown ? minNoteY : maxNoteY} y2={bar.stemDown ? maxNoteY + 36 : minNoteY - 36} className="staff-stem" />}
        <line x1={start + (index + 1) * barWidth} x2={start + (index + 1) * barWidth} y1="80" y2="136" className="score-barline" />
        {index === positions.length - 1 && <line x1={start + (index + 1) * barWidth + 4} x2={start + (index + 1) * barWidth + 4} y1="80" y2="136" className="score-final-barline" />}
        <text x={bar.x} y={labelsY} textAnchor="middle" className={labels[index] ? 'score-chord-label' : 'score-measure-label'}>{labels[index] ?? `Bar ${index + 1}`}</text>
      </g>;
    })}
  </svg>;
}

export function Piano({ activeNotes = [], onPlay, startNote = 60, octaves = 2 }: {
  activeNotes?: number[];
  onPlay?: (midi: number) => void;
  startNote?: number;
  octaves?: number;
}) {
  const notes = Array.from({ length: Math.max(1, Math.min(4, octaves)) * 12 }, (_, i) => startNote + i);
  const white = notes.filter((note) => !pitch(note).sharp);
  const black = notes.filter((note) => pitch(note).sharp);
  const trigger = (midi: number) => {
    if (onPlay) onPlay(midi);
    else void playNotes([midi]);
  };
  return <div className="piano" role="group" aria-label="Playable piano keyboard">
    <div className="piano-white-keys">
      {white.map((midi) => <button type="button" key={midi} className={`piano-white ${activeNotes.includes(midi) ? 'is-active' : ''}`} onClick={() => trigger(midi)} aria-label={`Play ${pitch(midi).name}${pitch(midi).octave}`}><span>{pitch(midi).name === 'C' ? `C${pitch(midi).octave}` : ''}</span></button>)}
    </div>
    {black.map((midi) => {
      const before = white.filter((note) => note < midi).length;
      return <button type="button" key={midi} className={`piano-black ${activeNotes.includes(midi) ? 'is-active' : ''}`} style={{ left: `${(before - 0.31) / white.length * 100}%`, width: `${0.62 / white.length * 100}%` }} onClick={() => trigger(midi)} aria-label={`Play ${pitch(midi).name}${pitch(midi).octave}`} />;
    })}
  </div>;
}
