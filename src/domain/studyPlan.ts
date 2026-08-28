import type { StudyPlanMaterial, StudyPlanModule, StudyPlanProfile, StudyPlanTask } from '../types';

const DEFAULT_EXAM_DATE = '2026-12-06';

export function createDefaultStudyPlanProfile(now = new Date()): StudyPlanProfile {
  return {
    level: 'N1',
    startDate: localDateString(now),
    examDate: DEFAULT_EXAM_DATE,
    studyDaysPerWeek: 6,
    dailyMinutes: 90,
    materials: [
      defaultMaterial('shin-kanzen-grammar', '新完全掌握 N1 语法', 'grammar'),
      defaultMaterial('shin-kanzen-reading', '新完全掌握 N1 阅读', 'reading'),
      defaultMaterial('shin-kanzen-listening', '新完全掌握 N1 听力', 'listening'),
    ],
    goal: '',
  };
}

export function createStudyMaterial(): StudyPlanMaterial {
  return defaultMaterial(`material-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, '', 'other');
}

export function tasksForDate(tasks: StudyPlanTask[], date: string) {
  return tasks.filter((task) => task.date === date).sort((left, right) => left.title.localeCompare(right.title));
}

export function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days = Array.from({ length: first.getDay() }, () => null as string | null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(localDateString(new Date(month.getFullYear(), month.getMonth(), day)));
  }
  while (days.length % 7) days.push(null);
  return days;
}

export function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultMaterial(id: string, title: string, module: StudyPlanModule): StudyPlanMaterial {
  return { id, title, module, currentPosition: '' };
}
