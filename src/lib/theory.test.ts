import test from 'node:test';
import assert from 'node:assert/strict';
import { units } from '../data/curriculum';
import { chordNotes, generateChordQuestion, generateIntervalQuestion, generateNoteQuestion, intervalName, midiFrequency, noteName, scaleNotes } from './theory';
import { completeLesson, initialProgress, loadProgress, parseProgress, recordPractice, saveProgress, todayKey } from './progress';

test('the harmony path has unique lessons and answerable, nonempty questions', () => {
  assert.equal(units.length, 12);
  const lessonIds = new Set<string>();
  const questionIds = new Set<string>();
  let scoreQuestions = 0;
  for (const unit of units) {
    assert.match(unit.color, /^#[\da-f]{6}$/i);
    assert.equal(unit.lessons.length, 3);
    for (const lesson of unit.lessons) {
      assert.ok(!lessonIds.has(lesson.id), `duplicate lesson ${lesson.id}`);
      lessonIds.add(lesson.id);
      assert.ok(lesson.concept.length > 30);
      assert.notEqual(lesson.type, 'rhythm');
      assert.ok(lesson.questions.length >= 5);
      for (const question of lesson.questions) {
        assert.ok(!questionIds.has(question.id), `duplicate question ${question.id}`);
        questionIds.add(question.id);
        assert.equal(question.choices.filter(choice => choice === question.answer).length, 1, `${question.id} answer missing or repeated`);
        assert.equal(new Set(question.choices).size, question.choices.length);
        assert.ok(question.explanation.length > 10);
        if (question.score) {
          scoreQuestions++;
          assert.ok(question.score.chords.length > 0 && question.score.chords.length <= 4);
          const diatonicPitchClasses = new Set([0, 2, 4, 5, 7, 9, 11]);
          const validChords = new Set(['0,4,7', '0,4,9', '0,5,9', '2,7,11', '2,5,9', '0,4,7,11']);
          for (const chord of question.score.chords) {
            assert.ok(chord.length >= 3 && chord.every(n => Number.isInteger(n) && n >= 0 && n <= 127));
            assert.ok(chord.every(n => diatonicPitchClasses.has(n % 12)), `${question.id} score requires unimplemented accidental spelling`);
            const pitchClasses = [...new Set(chord.map(n => n % 12))].sort((a, b) => a - b).join(',');
            assert.ok(validChords.has(pitchClasses), `${question.id} score has unexpected chord tones`);
          }
        }
      }
    }
  }
  assert.equal(lessonIds.size, 36);
  assert.equal(questionIds.size, 180);
  assert.ok(scoreQuestions >= 10);
});

test('theory tools build representative chords and modal/minor scales accurately', () => {
  assert.deepEqual(chordNotes(60, 'major'), [60, 64, 67]);
  assert.deepEqual(chordNotes(59, 'halfDiminished7'), [59, 62, 65, 69]);
  assert.deepEqual(chordNotes(59, 'diminished7'), [59, 62, 65, 68]);
  assert.deepEqual(scaleNotes(57, 'harmonic minor'), [57, 59, 60, 62, 64, 65, 68]);
  assert.deepEqual(scaleNotes(62, 'Dorian'), [62, 64, 65, 67, 69, 71, 72]);
  assert.equal(noteName(60), 'C4');
  assert.equal(noteName(66), 'F♯4');
  assert.equal(intervalName(7), 'Perfect 5th');
  assert.equal(midiFrequency(69), 440);
});

test('generated practice questions stay valid across clefs and random roots', () => {
  for (let i = 0; i < 150; i++) {
    for (const question of [generateNoteQuestion('both'), generateIntervalQuestion(), generateChordQuestion()]) {
      assert.equal(question.choices.length, 4);
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(question.choices.includes(question.answer));
      if (question.staff) {
        const midi = question.staff.notes[0];
        assert.equal(question.answer, noteName(midi).replace(/\d+$/, ''));
        assert.match(question.answer, /^[A-G]$/);
      }
      if (question.prompt.includes('interval')) {
        const [start, end] = question.audio!;
        assert.equal(question.answer, intervalName(end[0] - start[0]));
      }
    }
  }
});

test('a real first lesson starts with no fabricated activity and reaches mastery at 80%', () => {
  const start = initialProgress();
  assert.equal(start.xp, 0);
  assert.equal(start.streak, 0);
  assert.equal(start.dailyGoal, 40);
  assert.deepEqual(start.completedLessons, []);
  const failed = completeLesson(start, 'tonal-home', 3, 5);
  assert.deepEqual(failed.completedLessons, []);
  assert.equal(failed.lessonScores['tonal-home'], 60);
  const passed = completeLesson(failed, 'tonal-home', 4, 5);
  assert.deepEqual(passed.completedLessons, ['tonal-home']);
  assert.equal(passed.lessonScores['tonal-home'], 80);
  assert.equal(passed.xp, 90);
  assert.equal(passed.dailyXp[todayKey()], 90);
});

test('a replay keeps best score, does not duplicate mastery, and preserves today’s streak', () => {
  const first = completeLesson(initialProgress(), 'tonal-home', 5, 5);
  const repeat = completeLesson(first, 'tonal-home', 4, 5);
  assert.equal(repeat.streak, 1);
  assert.equal(repeat.lessonScores['tonal-home'], 100);
  assert.deepEqual(repeat.completedLessons, ['tonal-home']);
  assert.equal(repeat.xp, first.xp + 40);
});

test('practice continues yesterday’s streak and restarts a broken one', () => {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const previous = { ...initialProgress(), streak: 4, lastPracticeDate: todayKey(yesterday) };
  const next = recordPractice(previous, 6, 8, 5);
  assert.equal(next.streak, 5);
  assert.equal(next.bestNoteStreak, 5);
  assert.equal(next.xp, 30);
  const old = new Date(); old.setDate(old.getDate() - 3);
  assert.equal(recordPractice({ ...previous, lastPracticeDate: todayKey(old) }, 2, 4).streak, 1);
});

test('empty sessions do not grant XP, a streak, or completion', () => {
  const start = initialProgress();
  assert.deepEqual(completeLesson(start, 'tonal-home', 100, 0), start);
  assert.deepEqual(recordPractice(start, 10, 0, 8), start);
});

test('progress imports reject unrelated JSON and normalize damaged fields', () => {
  for (const input of [null, [], {}, { version: 1 }, { version: 2 }, { ...initialProgress(), xp: '500' }]) {
    assert.equal(parseProgress(input), null);
  }
  const parsed = parseProgress({ ...initialProgress(),
    xp: 5.9, completedLessons: ['a', 'a', '', null, 7],
    lastPracticeDate: '2026-02-30', streak: 40,
    lessonScores: { a: 500, b: -2, c: '100' },
    dailyXp: { '2026-02-30': 99, '2026-02-28': 25, nope: 123 },
    dailyGoal: -100,
  });
  assert.ok(parsed);
  assert.equal(parsed.xp, 5);
  assert.equal(parsed.lastPracticeDate, null);
  assert.equal(parsed.streak, 0);
  assert.deepEqual(parsed.completedLessons, ['a']);
  assert.deepEqual(parsed.lessonScores, { a: 100 });
  assert.deepEqual(parsed.dailyXp, { '2026-02-28': 25 });
  assert.equal(parsed.dailyGoal, 20);
});

test('corrupt or unavailable browser storage does not crash learning', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{broken', setItem: () => { throw new Error('quota'); } } });
    assert.deepEqual(loadProgress(), initialProgress());
    assert.equal(saveProgress(initialProgress()), false);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('blocked'); } });
    assert.deepEqual(loadProgress(), initialProgress());
    assert.equal(saveProgress(initialProgress()), false);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
