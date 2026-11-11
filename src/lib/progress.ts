/** Browser-local learning history. No account or network required. */
export type Progress = {
  version: 1;
  xp: number;
  streak: number;
  lastPracticeDate: string | null;
  completedLessons: string[];
  lessonScores: Record<string, number>;
  dailyXp: Record<string, number>;
  bestNoteStreak: number;
  sound: boolean;
  dailyGoal: number;
};

export const STORAGE_KEY = 'cadence.progress.v1';

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function initialProgress(): Progress {
  return {
    version: 1, xp: 0, streak: 0, lastPracticeDate: null,
    completedLessons: [], lessonScores: {}, dailyXp: {},
    bestNoteStreak: 0, sound: true, dailyGoal: 40,
  };
}

const natural = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value))) : fallback;

function numericRecord(value: unknown, max = Number.MAX_SAFE_INTEGER): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, n]) => typeof n === 'number' && Number.isFinite(n) && n >= 0).map(([key, n]) => [key, Math.min(max, natural(n))]));
}

function previousDay(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return todayKey(yesterday);
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate imports without ever trusting their fields as application state. */
export function parseProgress(value: unknown): Progress | null {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('version' in value) || value.version !== 1) return null;
    const p = value as Record<string, unknown>;
    if (typeof p.xp !== 'number' || !Number.isFinite(p.xp) || p.xp < 0 || !Array.isArray(p.completedLessons)
      || !p.lessonScores || typeof p.lessonScores !== 'object' || Array.isArray(p.lessonScores)
      || !p.dailyXp || typeof p.dailyXp !== 'object' || Array.isArray(p.dailyXp)) return null;
    const last = validDate(p.lastPracticeDate) ? p.lastPracticeDate : null;
    return {
      version: 1,
      xp: natural(p.xp),
      streak: last === todayKey() || last === previousDay() ? natural(p.streak) : 0,
      lastPracticeDate: last,
      completedLessons: [...new Set(p.completedLessons.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200))],
      lessonScores: numericRecord(p.lessonScores, 100),
      dailyXp: Object.fromEntries(Object.entries(numericRecord(p.dailyXp)).filter(([key]) => validDate(key))),
      bestNoteStreak: natural(p.bestNoteStreak),
      sound: typeof p.sound === 'boolean' ? p.sound : true,
      dailyGoal: Math.max(20, Math.min(500, natural(p.dailyGoal, 40))),
    };
}

export function loadProgress(): Progress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? parseProgress(JSON.parse(raw)) || initialProgress() : initialProgress();
  } catch {
    return initialProgress();
  }
}

/** False means storage is unavailable or full; the app can still use in-memory state. */
export function saveProgress(progress: Progress): boolean {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

function award(progress: Progress, xp: number): Progress {
  const today = todayKey();
  const streak = progress.lastPracticeDate === today
    ? progress.streak
    : progress.lastPracticeDate === previousDay() ? progress.streak + 1 : 1;
  return {
    ...progress,
    xp: progress.xp + xp,
    streak: Math.max(1, streak),
    lastPracticeDate: today,
    dailyXp: { ...progress.dailyXp, [today]: (progress.dailyXp[today] || 0) + xp },
  };
}

function counts(correct: number, total: number) {
  const attempts = natural(total);
  return { correct: Math.min(attempts, natural(correct)), total: attempts };
}

/** 80% marks a lesson mastered. Replays strengthen recall and still earn XP. */
export function completeLesson(progress: Progress, lessonId: string, correct: number, total: number): Progress {
  const count = counts(correct, total);
  if (count.total === 0) return progress;
  const score = Math.round(count.correct / count.total * 100);
  const mastered = score >= 80;
  const firstMastery = mastered && !progress.completedLessons.includes(lessonId);
  const next = award(progress, count.correct * 10 + (firstMastery ? 20 : 0));
  return {
    ...next,
    completedLessons: firstMastery ? [...progress.completedLessons, lessonId] : [...progress.completedLessons],
    lessonScores: { ...progress.lessonScores, [lessonId]: Math.max(progress.lessonScores[lessonId] || 0, score) },
  };
}

export function recordPractice(progress: Progress, correct: number, total: number, bestStreak = 0): Progress {
  const count = counts(correct, total);
  if (count.total === 0) return progress;
  return {
    ...award(progress, count.correct * 5),
    bestNoteStreak: Math.max(progress.bestNoteStreak, natural(bestStreak)),
  };
}
