import { Task, Dependency, Project, CascadeChangeLog } from '../types';
import { cascadeScheduleUpdates } from './dependencyEngine';
import { addDaysToDate, daysBetween } from './dateUtils';

/**
 * Synchronizes task progress percentage and status automatically.
 * - 0% -> 'todo' (unless manually 'blocked')
 * - 1% - 99% -> 'in_progress' (unless manually 'blocked')
 * - 100% -> 'completed'
 */
export function syncTaskStatusAndProgress(
  task: Task,
  updates: Partial<Task>
): Task {
  const newTask = { ...task, ...updates };

  // If progress was explicitly changed
  if (updates.progress !== undefined && updates.status === undefined) {
    if (newTask.progress <= 0) {
      newTask.progress = 0;
      if (newTask.status !== 'blocked') {
        newTask.status = 'todo';
      }
    } else if (newTask.progress >= 100) {
      newTask.progress = 100;
      newTask.status = 'completed';
    } else {
      if (newTask.status !== 'blocked') {
        newTask.status = 'in_progress';
      }
    }
  }

  // If status was explicitly changed
  if (updates.status !== undefined && updates.progress === undefined) {
    if (newTask.status === 'todo') {
      newTask.progress = 0;
    } else if (newTask.status === 'completed') {
      newTask.progress = 100;
    } else if (newTask.status === 'in_progress') {
      if (newTask.progress === 0 || newTask.progress === 100) {
        newTask.progress = 50;
      }
    }
    // If 'blocked', keep existing progress percentage!
  }

  return newTask;
}

/**
 * Checks if a task is overdue/expired.
 */
export function isTaskOverdue(task: Task, todayStr: string = new Date().toISOString().split('T')[0]): boolean {
  if (task.status === 'completed' || task.progress === 100) return false;
  return task.endDate < todayStr;
}

/**
 * Delays a blocked task by specified shift days (default +1 day) and cascades downstream.
 */
export function delayBlockedTask(
  targetTaskId: string,
  shiftDays: number = 1,
  tasks: Task[],
  dependencies: Dependency[],
  projects: Project[] = []
): { updatedTasks: Task[]; changeLogs: CascadeChangeLog[]; updatedProjects: Project[] } {
  const targetTask = tasks.find((t) => t.id === targetTaskId);
  if (!targetTask) {
    return { updatedTasks: tasks, changeLogs: [], updatedProjects: projects };
  }

  const newStart = addDaysToDate(targetTask.startDate, shiftDays);
  const newEnd = addDaysToDate(targetTask.endDate, shiftDays);

  return cascadeScheduleUpdates(
    targetTaskId,
    newStart,
    newEnd,
    tasks,
    dependencies,
    projects
  );
}

/**
 * Batch delays all blocked tasks by +1 day (e.g. daily auto-postpone).
 */
export function delayAllBlockedTasks(
  tasks: Task[],
  dependencies: Dependency[],
  projects: Project[] = []
): { updatedTasks: Task[]; changeLogs: CascadeChangeLog[]; updatedProjects: Project[] } {
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  if (blockedTasks.length === 0) {
    return { updatedTasks: tasks, changeLogs: [], updatedProjects: projects };
  }

  let currentTasks = [...tasks];
  let allChangeLogs: CascadeChangeLog[] = [];
  let currentProjects = [...projects];

  for (const bTask of blockedTasks) {
    const { updatedTasks, changeLogs, updatedProjects } = delayBlockedTask(
      bTask.id,
      1,
      currentTasks,
      dependencies,
      currentProjects
    );
    currentTasks = updatedTasks;
    currentProjects = updatedProjects;
    allChangeLogs = [...allChangeLogs, ...changeLogs];
  }

  return {
    updatedTasks: currentTasks,
    changeLogs: allChangeLogs,
    updatedProjects: currentProjects,
  };
}
