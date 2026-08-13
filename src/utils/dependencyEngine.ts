import { Task, Dependency, CascadeChangeLog, Project } from '../types';
import { addDaysToDate, daysBetween, parseDate } from './dateUtils';
import { differenceInCalendarDays } from 'date-fns';

/**
 * Organizes tasks into a hierarchical tree or flattened list maintaining hierarchy order.
 */
export interface TaskWithLevel extends Task {
  level: number;
  hasChildren: boolean;
  children: TaskWithLevel[];
}

export function buildTaskHierarchy(tasks: Task[]): TaskWithLevel[] {
  const taskMap = new Map<string, TaskWithLevel>();

  tasks.forEach((task) => {
    taskMap.set(task.id, {
      ...task,
      level: 0,
      hasChildren: false,
      children: [],
    });
  });

  const roots: TaskWithLevel[] = [];

  tasks.forEach((task) => {
    const item = taskMap.get(task.id)!;
    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      parent.hasChildren = true;
      parent.children.push(item);
    } else {
      roots.push(item);
    }
  });

  // Calculate levels recursively
  function setLevel(nodes: TaskWithLevel[], level: number) {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((node) => {
      node.level = level;
      if (node.children.length > 0) {
        setLevel(node.children, level + 1);
      }
    });
  }

  setLevel(roots, 0);
  return roots;
}

/**
 * Flatten tree for table rendering, respecting expanded state.
 */
export function flattenTaskTree(roots: TaskWithLevel[]): TaskWithLevel[] {
  const result: TaskWithLevel[] = [];

  function traverse(nodes: TaskWithLevel[]) {
    nodes.forEach((node) => {
      result.push(node);
      if (node.hasChildren && node.expanded !== false) {
        traverse(node.children);
      }
    });
  }

  traverse(roots);
  return result;
}

/**
 * Recalculate parent tasks' start/end dates and progress based on subtasks.
 */
export function syncParentTaskDates(tasks: Task[]): Task[] {
  const updatedTasks = [...tasks];
  const taskMap = new Map<string, Task>();
  updatedTasks.forEach((t) => taskMap.set(t.id, { ...t }));

  // Process bottom-up (find max depth)
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 10) {
    changed = false;
    iterations++;

    for (const task of taskMap.values()) {
      if (!task.parentId) continue;
      const parent = taskMap.get(task.parentId);
      if (!parent) continue;

      const siblings = Array.from(taskMap.values()).filter((t) => t.parentId === parent.id);
      if (siblings.length === 0) continue;

      // Calculate min start date and max end date
      let minStart = siblings[0].startDate;
      let maxEnd = siblings[0].endDate;
      let totalProgress = 0;

      siblings.forEach((s) => {
        if (s.startDate < minStart) minStart = s.startDate;
        if (s.endDate > maxEnd) maxEnd = s.endDate;
        totalProgress += s.progress;
      });

      const avgProgress = Math.round(totalProgress / siblings.length);
      const newDuration = daysBetween(minStart, maxEnd);

      if (
        parent.startDate !== minStart ||
        parent.endDate !== maxEnd ||
        parent.progress !== avgProgress ||
        parent.durationDays !== newDuration
      ) {
        parent.startDate = minStart;
        parent.endDate = maxEnd;
        parent.durationDays = newDuration;
        parent.progress = avgProgress;
        changed = true;
      }
    }
  }

  return Array.from(taskMap.values());
}

/**
 * Cascading delay calculation engine (联动自动推迟)
 * When a task is moved or prolonged, automatically adjust successor tasks and projects.
 */
export function cascadeScheduleUpdates(
  modifiedTaskId: string,
  newStartDate: string,
  newEndDate: string,
  currentTasks: Task[],
  dependencies: Dependency[],
  projects: Project[] = []
): { updatedTasks: Task[]; changeLogs: CascadeChangeLog[]; updatedProjects: Project[] } {
  const taskMap = new Map<string, Task>();
  currentTasks.forEach((t) => taskMap.set(t.id, { ...t }));

  const targetTask = taskMap.get(modifiedTaskId);
  if (!targetTask) {
    return { updatedTasks: currentTasks, changeLogs: [], updatedProjects: projects };
  }

  const changeLogs: CascadeChangeLog[] = [];

  // 1. Update the modified task itself
  const oldStart = targetTask.startDate;
  const oldEnd = targetTask.endDate;

  const duration = daysBetween(newStartDate, newEndDate);
  targetTask.startDate = newStartDate;
  targetTask.endDate = newEndDate;
  targetTask.durationDays = duration;

  // Calculate shift difference in days
  const shiftDeltaDays = differenceInCalendarDays(parseDate(newStartDate), parseDate(oldStart));

  // If this task has subtasks, shift all subtasks accordingly!
  if (shiftDeltaDays !== 0) {
    function shiftSubtasks(parentId: string, delta: number) {
      const children = Array.from(taskMap.values()).filter((t) => t.parentId === parentId);
      children.forEach((child) => {
        const childOldStart = child.startDate;
        const childOldEnd = child.endDate;
        const childNewStart = addDaysToDate(childOldStart, delta);
        const childNewEnd = addDaysToDate(childOldEnd, delta);

        child.startDate = childNewStart;
        child.endDate = childNewEnd;

        changeLogs.push({
          taskId: child.id,
          taskTitle: child.title,
          oldStartDate: childOldStart,
          newStartDate: childNewStart,
          oldEndDate: childOldEnd,
          newEndDate: childNewEnd,
          shiftedDays: delta,
          reason: `跟随父任务「${targetTask?.title}」联动移位`,
        });

        // Recurse down subtask tree
        shiftSubtasks(child.id, delta);
      });
    }
    shiftSubtasks(modifiedTaskId, shiftDeltaDays);
  }

  // 2. Queue for cascading dependency resolution (Topological propagation)
  const queue: string[] = [modifiedTaskId];
  const processed = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const sourceTask = taskMap.get(currentId);
    if (!sourceTask) continue;

    // Find all successor dependencies coming out from currentId
    const outgoingDeps = dependencies.filter((dep) => dep.fromTaskId === currentId);

    for (const dep of outgoingDeps) {
      const target = taskMap.get(dep.toTaskId);
      if (!target) continue;

      let requiredStart = target.startDate;
      let requiredEnd = target.endDate;
      let needsShift = false;

      // Finish-to-Start (FS): Target start must be >= Source end + 1 day + lag
      if (dep.type === 'FS' || !dep.type) {
        const minTargetStart = addDaysToDate(sourceTask.endDate, 1 + dep.lagDays);
        if (target.startDate < minTargetStart) {
          const dayShift = differenceInCalendarDays(
            parseDate(minTargetStart),
            parseDate(target.startDate)
          );
          requiredStart = minTargetStart;
          requiredEnd = addDaysToDate(target.endDate, dayShift);
          needsShift = true;
        }
      }
      // Start-to-Start (SS): Target start must be >= Source start + lag
      else if (dep.type === 'SS') {
        const minTargetStart = addDaysToDate(sourceTask.startDate, dep.lagDays);
        if (target.startDate < minTargetStart) {
          const dayShift = differenceInCalendarDays(
            parseDate(minTargetStart),
            parseDate(target.startDate)
          );
          requiredStart = minTargetStart;
          requiredEnd = addDaysToDate(target.endDate, dayShift);
          needsShift = true;
        }
      }
      // Finish-to-Finish (FF): Target end must be >= Source end + lag
      else if (dep.type === 'FF') {
        const minTargetEnd = addDaysToDate(sourceTask.endDate, dep.lagDays);
        if (target.endDate < minTargetEnd) {
          const dayShift = differenceInCalendarDays(
            parseDate(minTargetEnd),
            parseDate(target.endDate)
          );
          requiredEnd = minTargetEnd;
          requiredStart = addDaysToDate(target.startDate, dayShift);
          needsShift = true;
        }
      }

      if (needsShift) {
        const targetOldStart = target.startDate;
        const targetOldEnd = target.endDate;
        const shiftedDays = differenceInCalendarDays(
          parseDate(requiredStart),
          parseDate(targetOldStart)
        );

        target.startDate = requiredStart;
        target.endDate = requiredEnd;
        target.durationDays = daysBetween(requiredStart, requiredEnd);

        changeLogs.push({
          taskId: target.id,
          taskTitle: target.title,
          oldStartDate: targetOldStart,
          newStartDate: requiredStart,
          oldEndDate: targetOldEnd,
          newEndDate: requiredEnd,
          shiftedDays,
          reason: `前置任务「${sourceTask.title}」顺延推迟`,
        });

        // Add successor to queue for further cascade propagation
        queue.push(target.id);
      }
    }
  }

  // 3. Sync parents up after cascading
  let resultTasks = Array.from(taskMap.values());
  resultTasks = syncParentTaskDates(resultTasks);

  // 4. Update Projects overall dates if necessary
  const updatedProjects = projects.map((p) => {
    const projTasks = resultTasks.filter((t) => t.projectId === p.id);
    if (projTasks.length === 0) return p;

    let pMinStart = projTasks[0].startDate;
    let pMaxEnd = projTasks[0].endDate;
    projTasks.forEach((t) => {
      if (t.startDate < pMinStart) pMinStart = t.startDate;
      if (t.endDate > pMaxEnd) pMaxEnd = t.endDate;
    });

    return {
      ...p,
      startDate: pMinStart,
      endDate: pMaxEnd,
    };
  });

  return {
    updatedTasks: resultTasks,
    changeLogs,
    updatedProjects,
  };
}

/**
 * Calculates critical path (tasks with zero float time)
 */
export function calculateCriticalPath(tasks: Task[], dependencies: Dependency[]): Set<string> {
  const criticalSet = new Set<string>();
  if (tasks.length === 0) return criticalSet;

  // Simple heuristic: find task chain leading to the max end date
  let maxEndDate = tasks[0].endDate;
  let endTask: Task = tasks[0];

  tasks.forEach((t) => {
    if (t.endDate > maxEndDate) {
      maxEndDate = t.endDate;
      endTask = t;
    }
  });

  // Trace back predecessors
  const visited = new Set<string>();
  function traceBack(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    criticalSet.add(taskId);

    const incomingDeps = dependencies.filter((d) => d.toTaskId === taskId);
    incomingDeps.forEach((dep) => {
      traceBack(dep.fromTaskId);
    });
  }

  traceBack(endTask.id);
  return criticalSet;
}
