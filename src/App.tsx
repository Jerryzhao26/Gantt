import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { GanttContainer } from './components/GanttChart/GanttContainer';
import { KanbanDashboard } from './components/KanbanDashboard';
import { CascadeNotifier } from './components/CascadeNotifier';
import { TaskModal } from './components/Modals/TaskModal';
import { ProjectModal } from './components/Modals/ProjectModal';
import { ExportImportModal } from './components/Modals/ExportImportModal';
import { KanbanDetailModal } from './components/Modals/KanbanDetailModal';

import { Project, Task, Dependency, ViewMode, FilterOptions, CascadeChangeLog, TaskStatus } from './types';
import { DEFAULT_PROJECTS, DEFAULT_TASKS, DEFAULT_DEPENDENCIES } from './data/defaultProjects';
import {
  buildTaskHierarchy,
  flattenTaskTree,
  syncParentTaskDates,
  cascadeScheduleUpdates,
  calculateCriticalPath,
} from './utils/dependencyEngine';
import { generateTimelineColumns, addDaysToDate, daysBetween, parseDate } from './utils/dateUtils';
import { differenceInCalendarDays } from 'date-fns';
import {
  syncTaskStatusAndProgress,
  delayBlockedTask,
  delayAllBlockedTasks,
} from './utils/statusUtils';

export default function App() {
  // LocalStorage Persistence Init
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('liquid_gantt_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('liquid_gantt_tasks');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [dependencies, setDependencies] = useState<Dependency[]>(() => {
    const saved = localStorage.getItem('liquid_gantt_dependencies');
    return saved ? JSON.parse(saved) : DEFAULT_DEPENDENCIES;
  });

  // UI state
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [autoCascade, setAutoCascade] = useState<boolean>(true);
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [jumpToTodaySignal, setJumpToTodaySignal] = useState(0);

  // Filter state
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    status: 'all',
    priority: 'all',
    assignee: 'all',
  });

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentTaskIdForSubtask, setParentTaskIdForSubtask] = useState<string | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Kanban Detail Secondary Menu Modal
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [kanbanCategory, setKanbanCategory] = useState<
    'overdue' | 'blocked' | 'completed' | 'in_progress' | 'all'
  >('all');

  // Cascade Delay Logs
  const [cascadeLogs, setCascadeLogs] = useState<CascadeChangeLog[]>([]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('liquid_gantt_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('liquid_gantt_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('liquid_gantt_dependencies', JSON.stringify(dependencies));
  }, [dependencies]);

  // Dark Mode Toggle Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Filter Tasks by active Project & Filter Options
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeProjectId !== 'all') {
      result = result.filter((t) => t.projectId === activeProjectId);
    }

    if (filterOptions.searchQuery.trim()) {
      const q = filterOptions.searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.assignee && t.assignee.toLowerCase().includes(q))
      );
    }

    if (filterOptions.status !== 'all') {
      result = result.filter((t) => t.status === filterOptions.status);
    }

    if (filterOptions.priority !== 'all') {
      result = result.filter((t) => t.priority === filterOptions.priority);
    }

    return result;
  }, [tasks, activeProjectId, filterOptions]);

  // Hierarchical Tasks & Flattening for Rendering
  const taskHierarchy = useMemo(() => {
    return buildTaskHierarchy(filteredTasks);
  }, [filteredTasks]);

  const flatTasks = useMemo(() => {
    return flattenTaskTree(taskHierarchy);
  }, [taskHierarchy]);

  // Calculate Overall Timeline Range (with generous padding so columns origin stays static while dragging)
  const timelineRange = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (tasks.length === 0) {
      return { start: addDaysToDate(todayStr, -30), end: addDaysToDate(todayStr, 60) };
    }

    let minStart = tasks[0].startDate;
    let maxEnd = tasks[0].endDate;

    tasks.forEach((t) => {
      if (t.startDate < minStart) minStart = t.startDate;
      if (t.endDate > maxEnd) maxEnd = t.endDate;
    });

    if (todayStr < minStart) minStart = todayStr;
    if (todayStr > maxEnd) maxEnd = todayStr;

    // Generous static buffer (-30 days to +60 days)
    return {
      start: addDaysToDate(minStart, -30),
      end: addDaysToDate(maxEnd, 60),
    };
  }, [tasks]);

  const columns = useMemo(() => {
    return generateTimelineColumns(timelineRange.start, timelineRange.end, viewMode);
  }, [timelineRange, viewMode]);

  // Critical Path Analysis
  const criticalPathSet = useMemo(() => {
    return calculateCriticalPath(tasks, dependencies);
  }, [tasks, dependencies]);

  // Handle Task Date Changes (Drag / Resize / Modal) with Cascading Delay Updates
  const handleTaskDatesChange = (
    taskId: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    if (!autoCascade) {
      // Direct update without cascade, but shift subtasks if target is a parent
      setTasks((prev) => {
        const taskMap = new Map<string, Task>();
        prev.forEach((t) => taskMap.set(t.id, { ...t }));
        const target = taskMap.get(taskId);
        if (!target) return prev;

        const oldStart = target.startDate;
        const shiftDeltaDays = differenceInCalendarDays(parseDate(newStartDate), parseDate(oldStart));

        target.startDate = newStartDate;
        target.endDate = newEndDate;
        target.durationDays = daysBetween(newStartDate, newEndDate);

        // Shift subtasks synchronously
        if (shiftDeltaDays !== 0) {
          function shiftSubtasks(parentId: string, delta: number) {
            const children = Array.from(taskMap.values()).filter((t) => t.parentId === parentId);
            children.forEach((child) => {
              const childNewStart = addDaysToDate(child.startDate, delta);
              const childNewEnd = addDaysToDate(child.endDate, delta);
              child.startDate = childNewStart;
              child.endDate = childNewEnd;
              child.durationDays = daysBetween(childNewStart, childNewEnd);
              shiftSubtasks(child.id, delta);
            });
          }
          shiftSubtasks(taskId, shiftDeltaDays);
        }

        return syncParentTaskDates(Array.from(taskMap.values()));
      });
      return;
    }

    // Trigger Cascading Schedule Update Engine (联动自动推迟)
    const { updatedTasks, changeLogs, updatedProjects } = cascadeScheduleUpdates(
      taskId,
      newStartDate,
      newEndDate,
      tasks,
      dependencies,
      projects
    );

    setTasks(updatedTasks);
    if (updatedProjects.length > 0) setProjects(updatedProjects);
    if (changeLogs.length > 0) {
      setCascadeLogs(changeLogs);
    }
  };

  // Toggle Parent Task Tree Expand
  const handleToggleExpand = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, expanded: t.expanded === false ? true : false } : t))
    );
  };

  // Bulk Collapse / Expand All Subtasks
  const handleToggleCollapseAll = () => {
    setTasks((prev) => {
      // Find all tasks that are parents to at least one subtask
      const parentTaskIds = new Set(prev.filter((t) => prev.some((c) => c.parentId === t.id)).map((t) => t.id));
      
      // If ANY parent task is collapsed (expanded === false), we EXPAND ALL.
      // Otherwise (all are expanded), we COLLAPSE ALL.
      const hasAnyCollapsed = prev.some((t) => parentTaskIds.has(t.id) && t.expanded === false);
      const targetState = hasAnyCollapsed; // true = expand all, false = collapse all

      return prev.map((t) => (parentTaskIds.has(t.id) ? { ...t, expanded: targetState } : t));
    });
  };

  // Save Task from Modal
  const handleSaveTask = (savedTask: Task, newDependencies: Dependency[]) => {
    let syncedTask = syncTaskStatusAndProgress(savedTask, {});
    let updatedTasks = [...tasks];
    const exists = updatedTasks.some((t) => t.id === syncedTask.id);

    if (exists) {
      updatedTasks = updatedTasks.map((t) => (t.id === syncedTask.id ? syncedTask : t));
    } else {
      updatedTasks.push(syncedTask);
    }

    // Sync parent task date ranges
    updatedTasks = syncParentTaskDates(updatedTasks);

    // Update dependencies
    let updatedDeps = dependencies.filter((d) => d.toTaskId !== syncedTask.id);
    updatedDeps = [...updatedDeps, ...newDependencies];

    if (autoCascade) {
      const { updatedTasks: cascadedTasks, changeLogs } = cascadeScheduleUpdates(
        syncedTask.id,
        syncedTask.startDate,
        syncedTask.endDate,
        updatedTasks,
        updatedDeps,
        projects
      );
      setTasks(cascadedTasks);
      setDependencies(updatedDeps);
      if (changeLogs.length > 0) setCascadeLogs(changeLogs);
    } else {
      setTasks(updatedTasks);
      setDependencies(updatedDeps);
    }
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const toDeleteIds = new Set<string>([taskId]);

    function findChildren(pId: string) {
      tasks.forEach((t) => {
        if (t.parentId === pId) {
          toDeleteIds.add(t.id);
          findChildren(t.id);
        }
      });
    }

    findChildren(taskId);

    const updatedTasks = tasks.filter((t) => !toDeleteIds.has(t.id));
    const updatedDeps = dependencies.filter(
      (d) => !toDeleteIds.has(d.fromTaskId) && !toDeleteIds.has(d.toTaskId)
    );

    setTasks(syncParentTaskDates(updatedTasks));
    setDependencies(updatedDeps);
    setSelectedTaskId(null);
  };

  // Keyboard Delete / Backspace Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTaskId) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const taskToDelete = tasks.find((t) => t.id === selectedTaskId);
        if (taskToDelete) {
          handleDeleteTask(selectedTaskId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, tasks]);

  // Quick Inline Add Subtask / Task
  const handleQuickInlineAdd = (title: string, parentId: string | null) => {
    const today = new Date().toISOString().split('T')[0];
    const projId = activeProjectId === 'all' ? (projects[0]?.id || 'proj-1') : activeProjectId;

    let startDate = today;
    let endDate = today;

    if (parentId) {
      const existingSubtasks = tasks.filter((t) => t.parentId === parentId);
      if (existingSubtasks.length > 0) {
        const maxEndDate = existingSubtasks.reduce(
          (max, t) => (t.endDate > max ? t.endDate : max),
          existingSubtasks[0].endDate
        );
        startDate = addDaysToDate(maxEndDate, 1);
        endDate = startDate; // Default 1 day length
      } else {
        const parentTask = tasks.find((t) => t.id === parentId);
        if (parentTask) {
          startDate = parentTask.startDate;
          endDate = parentTask.startDate; // Default 1 day length
        }
      }
    } else {
      endDate = addDaysToDate(today, 3);
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      projectId: projId,
      parentId,
      title,
      startDate,
      endDate,
      durationDays: daysBetween(startDate, endDate),
      progress: 0,
      status: 'todo',
      priority: 'medium',
      colorId: 'azure',
      expanded: true,
      order: Date.now(),
    };

    const updated = [...tasks, newTask];
    setTasks(syncParentTaskDates(updated));
  };

  // 🔗 Direct Quick Toggle Predecessor (No Secondary Menu!)
  const handleQuickTogglePredecessor = (targetTaskId: string, predecessorTaskId: string) => {
    const existing = dependencies.find(
      (d) => d.fromTaskId === predecessorTaskId && d.toTaskId === targetTaskId
    );

    let newDeps = [...dependencies];
    if (existing) {
      newDeps = newDeps.filter((d) => d.id !== existing.id);
    } else {
      newDeps.push({
        id: `dep-${Date.now()}`,
        fromTaskId: predecessorTaskId,
        toTaskId: targetTaskId,
        type: 'FS',
        lagDays: 0,
      });
    }

    setDependencies(newDeps);

    // Auto-cascade if enabled
    if (autoCascade) {
      const predTask = tasks.find((t) => t.id === predecessorTaskId);
      if (predTask) {
        const { updatedTasks, changeLogs } = cascadeScheduleUpdates(
          predTask.id,
          predTask.startDate,
          predTask.endDate,
          tasks,
          newDeps,
          projects
        );
        setTasks(updatedTasks);
        if (changeLogs.length > 0) setCascadeLogs(changeLogs);
      }
    }
  };

  // Remove Dependency
  const handleRemoveDependency = (dependencyId: string) => {
    setDependencies((prev) => prev.filter((d) => d.id !== dependencyId));
  };

  // ⚡ Quick Update Status & Auto Progress Sync
  const handleQuickUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          return syncTaskStatusAndProgress(t, { status: newStatus });
        }
        return t;
      });
      return syncParentTaskDates(updated);
    });

    // If marked as blocked, trigger delay and cascade
    if (newStatus === 'blocked' && autoCascade) {
      handleDelayBlockedTask(taskId);
    }
  };

  // ⚡ Quick Update Progress & Auto Status Sync
  const handleQuickUpdateProgress = (taskId: string, newProgress: number) => {
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          return syncTaskStatusAndProgress(t, { progress: newProgress });
        }
        return t;
      });
      return syncParentTaskDates(updated);
    });
  };

  // 🛡️ Single Blocked Task Delay + Cascading Propagation
  const handleDelayBlockedTask = (taskId: string) => {
    const { updatedTasks, changeLogs, updatedProjects } = delayBlockedTask(
      taskId,
      1,
      tasks,
      dependencies,
      projects
    );

    setTasks(updatedTasks);
    if (updatedProjects.length > 0) setProjects(updatedProjects);
    if (changeLogs.length > 0) setCascadeLogs(changeLogs);
  };

  // 🛡️ Batch Delay All Blocked Tasks + Cascading Propagation
  const handleBatchDelayBlocked = () => {
    const { updatedTasks, changeLogs, updatedProjects } = delayAllBlockedTasks(
      tasks,
      dependencies,
      projects
    );

    setTasks(updatedTasks);
    if (updatedProjects.length > 0) setProjects(updatedProjects);
    if (changeLogs.length > 0) setCascadeLogs(changeLogs);
  };

  // Indent / Outdent Task (Hierarchy adjust)
  const handleIndentTask = (taskId: string) => {
    const index = flatTasks.findIndex((t) => t.id === taskId);
    if (index <= 0) return;

    const prevTask = flatTasks[index - 1];
    if (prevTask.id === taskId) return;

    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, parentId: prevTask.id } : t));
      return syncParentTaskDates(updated);
    });
  };

  const handleOutdentTask = (taskId: string) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || !currentTask.parentId) return;

    const parent = tasks.find((t) => t.id === currentTask.parentId);
    const grandParentId = parent ? parent.parentId : null;

    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, parentId: grandParentId } : t));
      return syncParentTaskDates(updated);
    });
  };

  // Save Project from Modal
  const handleSaveProject = (project: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (exists) {
        return prev.map((p) => (p.id === project.id ? project : p));
      }
      return [...prev, project];
    });
    setActiveProjectId(project.id);
  };

  // Delete Project
  const handleDeleteProject = (projId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    setTasks((prev) => prev.filter((t) => t.projectId !== projId));
    setActiveProjectId('all');
  };

  // Import Full Data
  const handleImportData = (data: { projects: Project[]; tasks: Task[]; dependencies: Dependency[] }) => {
    setProjects(data.projects);
    setTasks(data.tasks);
    setDependencies(data.dependencies);
    if (data.projects.length > 0) setActiveProjectId(data.projects[0].id);
  };

  return (
    <div className="min-h-screen p-3 sm:p-5 flex flex-col font-sans transition-colors duration-300 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Glass Navigation */}
      <Header
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onOpenProjectModal={(p) => {
          setProjectToEdit(p || null);
          setIsProjectModalOpen(true);
        }}
        onOpenTaskModal={() => {
          setTaskToEdit(null);
          setParentTaskIdForSubtask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        autoCascade={autoCascade}
        onToggleAutoCascade={() => setAutoCascade(!autoCascade)}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={() => setShowCriticalPath(!showCriticalPath)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        filterOptions={filterOptions}
        onFilterChange={setFilterOptions}
        onJumpToToday={() => {
          setViewMode('day');
          setJumpToTodaySignal((prev) => prev + 1);
        }}
      />

      {/* 📊 Top Interactive Kanban Metrics Dashboard */}
      <KanbanDashboard
        tasks={filteredTasks}
        onOpenCategoryModal={(category) => {
          setKanbanCategory(category);
          setIsKanbanModalOpen(true);
        }}
      />

      {/* Main Split-Pane Gantt Container */}
      <GanttContainer
        columns={columns}
        tasks={flatTasks}
        dependencies={dependencies}
        viewMode={viewMode}
        selectedTaskId={selectedTaskId}
        jumpToTodaySignal={jumpToTodaySignal}
        onSelectTask={setSelectedTaskId}
        onToggleExpand={handleToggleExpand}
        onToggleCollapseAll={handleToggleCollapseAll}
        onAddSubtask={(pId) => {
          setTaskToEdit(null);
          setParentTaskIdForSubtask(pId);
          setIsTaskModalOpen(true);
        }}
        onAddRootTask={() => {
          setTaskToEdit(null);
          setParentTaskIdForSubtask(null);
          setIsTaskModalOpen(true);
        }}
        onEditTask={(t) => {
          setTaskToEdit(t);
          setIsTaskModalOpen(true);
        }}
        onDeleteTask={handleDeleteTask}
        onIndentTask={handleIndentTask}
        onOutdentTask={handleOutdentTask}
        onQuickInlineAdd={handleQuickInlineAdd}
        onTaskDatesChange={handleTaskDatesChange}
        onQuickTogglePredecessor={handleQuickTogglePredecessor}
        onRemoveDependency={handleRemoveDependency}
        onQuickUpdateStatus={handleQuickUpdateStatus}
        onQuickUpdateProgress={handleQuickUpdateProgress}
        onDelayBlockedTask={handleDelayBlockedTask}
        criticalPathSet={criticalPathSet}
        showCriticalPath={showCriticalPath}
      />

      {/* Floating Cascade Toast Notifier */}
      <CascadeNotifier
        logs={cascadeLogs}
        onDismiss={() => setCascadeLogs([])}
      />

      {/* Kanban Secondary Menu Detail Modal */}
      <KanbanDetailModal
        isOpen={isKanbanModalOpen}
        onClose={() => setIsKanbanModalOpen(false)}
        initialCategory={kanbanCategory}
        tasks={filteredTasks}
        projects={projects}
        dependencies={dependencies}
        onSelectAndLocateTask={(taskId) => {
          setSelectedTaskId(taskId);
        }}
        onEditTask={(task) => {
          setTaskToEdit(task);
          setIsTaskModalOpen(true);
        }}
        onToggleBlocked={(taskId, currentStatus) => {
          const nextStatus = currentStatus === 'blocked' ? 'in_progress' : 'blocked';
          handleQuickUpdateStatus(taskId, nextStatus);
        }}
        onDelayTask={(taskId) => handleDelayBlockedTask(taskId)}
        onBatchDelayBlocked={handleBatchDelayBlocked}
      />

      {/* Task Edit / Create Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        taskToEdit={taskToEdit}
        parentTaskId={parentTaskIdForSubtask}
        projects={projects}
        activeProjectId={activeProjectId === 'all' ? projects[0]?.id || 'proj-1' : activeProjectId}
        allTasks={tasks}
        existingDependencies={dependencies}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        onDelete={handleDeleteProject}
        projectToEdit={projectToEdit}
        allProjects={projects}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projects={projects}
        tasks={tasks}
        dependencies={dependencies}
        onImport={handleImportData}
      />
    </div>
  );
}
