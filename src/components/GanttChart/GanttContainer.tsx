import React, { useState, useRef, useEffect } from 'react';
import { TaskList } from './TaskList';
import { GanttTimeline } from './GanttTimeline';
import { DependencyArrows } from './DependencyArrows';
import { TaskWithLevel } from '../../utils/dependencyEngine';
import { DayColumn } from '../../utils/dateUtils';
import { Dependency, ViewMode, TaskStatus } from '../../types';
import { GripVertical } from 'lucide-react';

interface Props {
  columns: DayColumn[];
  tasks: TaskWithLevel[];
  dependencies: Dependency[];
  viewMode: ViewMode;
  selectedTaskId: string | null;
  jumpToTodaySignal?: number;
  onSelectTask: (taskId: string) => void;
  onToggleExpand: (taskId: string) => void;
  onToggleCollapseAll?: () => void;
  onAddSubtask: (parentTaskId: string) => void;
  onAddRootTask: () => void;
  onEditTask: (task: TaskWithLevel) => void;
  onDeleteTask: (taskId: string) => void;
  onIndentTask: (taskId: string) => void;
  onOutdentTask: (taskId: string) => void;
  onQuickInlineAdd: (title: string, parentId: string | null) => void;
  onTaskDatesChange: (taskId: string, newStartDate: string, newEndDate: string) => void;
  onQuickTogglePredecessor: (targetTaskId: string, predecessorTaskId: string) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onQuickUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onQuickUpdateProgress: (taskId: string, newProgress: number) => void;
  onDelayBlockedTask: (taskId: string) => void;
  onStartConnectDependency?: (fromTaskId: string) => void;
  criticalPathSet?: Set<string>;
  showCriticalPath?: boolean;
}

export const GanttContainer: React.FC<Props> = ({
  columns,
  tasks,
  dependencies,
  viewMode,
  selectedTaskId,
  jumpToTodaySignal,
  onSelectTask,
  onToggleExpand,
  onToggleCollapseAll,
  onAddSubtask,
  onAddRootTask,
  onEditTask,
  onDeleteTask,
  onIndentTask,
  onOutdentTask,
  onQuickInlineAdd,
  onTaskDatesChange,
  onQuickTogglePredecessor,
  onRemoveDependency,
  onQuickUpdateStatus,
  onQuickUpdateProgress,
  onDelayBlockedTask,
  onStartConnectDependency,
  criticalPathSet,
  showCriticalPath,
}) => {
  // Split pane width (default 420px)
  const [leftWidth, setLeftWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);

  const taskListRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Sync Vertical Scroll
  const handleTaskListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (taskListRef.current) {
      taskListRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Draggable Split Pane Resize
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(680, Math.max(260, e.clientX));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="relative flex-1 flex h-[calc(100vh-145px)] rounded-3xl liquid-glass overflow-hidden border border-white/60 dark:border-white/10 shadow-2xl">
      {/* Left Panel: Task Hierarchy Tree */}
      <div style={{ width: `${leftWidth}px` }} className="shrink-0 h-full flex flex-col">
        <TaskList
          tasks={tasks}
          allFlatTasks={tasks}
          dependencies={dependencies}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
          onToggleExpand={onToggleExpand}
          onToggleCollapseAll={onToggleCollapseAll}
          onAddSubtask={onAddSubtask}
          onAddRootTask={onAddRootTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onIndentTask={onIndentTask}
          onOutdentTask={onOutdentTask}
          onQuickInlineAdd={onQuickInlineAdd}
          onQuickTogglePredecessor={onQuickTogglePredecessor}
          onRemoveDependency={onRemoveDependency}
          onQuickUpdateStatus={onQuickUpdateStatus}
          onQuickUpdateProgress={onQuickUpdateProgress}
          onDelayBlockedTask={onDelayBlockedTask}
        />
      </div>

      {/* Draggable Vertical Splitter Bar */}
      <div
        onMouseDown={handleMouseDownResize}
        className="w-2 hover:w-3 cursor-col-resize bg-slate-200/60 dark:bg-slate-800/80 hover:bg-blue-500 transition-all z-30 flex items-center justify-center shrink-0"
        title="拖动调整树形图与甘特图宽度"
      >
        <GripVertical className="w-3 h-3 text-slate-400 opacity-50 hover:opacity-100" />
      </div>

      {/* Right Panel: Gantt Chart Grid Canvas & Overlay */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
        <GanttTimeline
          columns={columns}
          tasks={tasks}
          dependencies={dependencies}
          viewMode={viewMode}
          selectedTaskId={selectedTaskId}
          jumpToTodaySignal={jumpToTodaySignal}
          onSelectTask={onSelectTask}
          onTaskDatesChange={onTaskDatesChange}
          onStartConnectDependency={onStartConnectDependency}
          criticalPathSet={criticalPathSet}
          showCriticalPath={showCriticalPath}
        />
      </div>
    </div>
  );
};
