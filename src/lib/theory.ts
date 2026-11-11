import type { Question } from '../data/curriculum';

const PITCH_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const pitchClassName = (midi: number) => PITCH_NAMES[((midi % 12) + 12) % 12];
export const noteName = (midi: number): string => `${pitchClassName(midi)}${Math.floor(midi / 12) - 1}`;
export const midiFrequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export const INTERVALS = ['Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd', 'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th', 'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'];
export function intervalName(semitones: number): string {
  return INTERVALS[Math.abs(semitones)] || `${Math.abs(semitones)} semitones`;
}

export const CHORD_TYPES: Record<string, number[]> = {
  major: [0, 4, 7], minor: [0, 3, 7], diminished: [0, 3, 6], augmented: [0, 4, 8],
  major7: [0, 4, 7, 11], minor7: [0, 3, 7, 10], dominant7: [0, 4, 7, 10],
  halfDiminished7: [0, 3, 6, 10], diminished7: [0, 3, 6, 9], sus2: [0, 2, 7], sus4: [0, 5, 7],
};
export const SCALE_TYPES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  'natural minor': [0, 2, 3, 5, 7, 8, 10], 'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  pentatonic: [0, 2, 4, 7, 9], 'minor pentatonic': [0, 3, 5, 7, 10],
};
export const chordNotes = (root: number, quality = 'major') => (CHORD_TYPES[quality] || CHORD_TYPES.major).map(interval => root + interval);
export const scaleNotes = (root: number, mode = 'major') => (SCALE_TYPES[mode.toLowerCase()] || SCALE_TYPES.major).map(interval => root + interval);

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const shuffle = <T,>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
let sequence = 0;
const id = () => `practice-${Date.now()}-${++sequence}`;

export function generateNoteQuestion(clef: 'treble' | 'bass' | 'both' = 'treble'): Question {
  const selectedClef = clef === 'both' ? pick(['treble', 'bass'] as const) : clef;
  const pool = selectedClef === 'treble' ? [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81] : [40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
  const midi = pick(pool);
  const answer = pitchClassName(midi);
  const distractors = shuffle(['C', 'D', 'E', 'F', 'G', 'A', 'B'].filter(note => note !== answer)).slice(0, 3);
  return {
    id: id(), prompt: 'Name this note.', choices: shuffle([answer, ...distractors]), answer,
    explanation: `This is ${noteName(midi)} in the ${selectedClef} clef. Read its position relative to a familiar landmark.`,
    staff: { notes: [midi], clef: selectedClef },
  };
}

export function generateIntervalQuestion(): Question {
  const distance = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const root = pick([48, 50, 52, 53, 55, 57, 59, 60]);
  const answer = INTERVALS[distance];
  const distractors = shuffle(INTERVALS.slice(1).filter(name => name !== answer)).slice(0, 3);
  return {
    id: id(), prompt: 'What interval do you hear?', choices: shuffle([answer, ...distractors]), answer,
    explanation: `${noteName(root)} to ${noteName(root + distance)} spans ${distance} semitone${distance === 1 ? '' : 's'}: ${answer.toLowerCase()}.`,
    audio: [[root], [root + distance]],
  };
}

export function generateChordQuestion(): Question {
  const quality = pick(['major', 'minor', 'diminished', 'augmented']);
  const root = pick([48, 50, 52, 53, 55, 57]);
  const answer = quality[0].toUpperCase() + quality.slice(1);
  return {
    id: id(), prompt: 'What kind of chord do you hear?',
    choices: shuffle(['Major', 'Minor', 'Diminished', 'Augmented']), answer,
    explanation: `${answer} triads use ${CHORD_TYPES[quality].join('–')} semitones above the root. Listen for the third and the fifth.`,
    audio: [chordNotes(root, quality)],
  };
}
