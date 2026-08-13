import React, { useRef, useState, useEffect } from 'react';
import { TaskWithLevel } from '../../utils/dependencyEngine';
import { DayColumn, addDaysToDate, daysBetween, formatDate, parseDate } from '../../utils/dateUtils';
import { getColorById } from '../../utils/colorPalette';
import { ViewMode, Dependency } from '../../types';
import { differenceInCalendarDays } from 'date-fns';
import { Diamond, Flag, Clock, User, Link as LinkIcon, Plus, Minus, RotateCcw } from 'lucide-react';
import { DependencyArrows } from './DependencyArrows';

interface Props {
  columns: DayColumn[];
  tasks: TaskWithLevel[];
  dependencies: Dependency[];
  viewMode: ViewMode;
  selectedTaskId: string | null;
  jumpToTodaySignal?: number;
  onSelectTask: (taskId: string) => void;
  onTaskDatesChange: (taskId: string, newStartDate: string, newEndDate: string) => void;
  onStartConnectDependency?: (fromTaskId: string) => void;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  criticalPathSet?: Set<string>;
  showCriticalPath?: boolean;
}

export const GanttTimeline: React.FC<Props> = ({
  columns,
  tasks,
  dependencies,
  viewMode,
  selectedTaskId,
  jumpToTodaySignal,
  onSelectTask,
  onTaskDatesChange,
  onStartConnectDependency,
  onScroll,
  criticalPathSet,
  showCriticalPath,
}) => {
  // Dynamic Column Width State
  const [customWidth, setCustomWidth] = useState<number | null>(null);

  // Reset custom column width when viewMode changes
  useEffect(() => {
    setCustomWidth(null);
  }, [viewMode]);

  const defaultColumnWidth = viewMode === 'day' ? 42 : viewMode === 'week' ? 28 : 18;
  const columnWidth = customWidth ?? defaultColumnWidth;

  const minWidth = viewMode === 'day' ? 18 : viewMode === 'week' ? 12 : 8;
  const maxWidth = viewMode === 'day' ? 120 : viewMode === 'week' ? 90 : 60;
  const step = viewMode === 'day' ? 6 : viewMode === 'week' ? 4 : 3;

  const handleZoomIn = () => {
    setCustomWidth((prev) => {
      const cur = prev ?? defaultColumnWidth;
      return Math.min(maxWidth, cur + step);
    });
  };

  const handleZoomOut = () => {
    setCustomWidth((prev) => {
      const cur = prev ?? defaultColumnWidth;
      return Math.max(minWidth, cur - step);
    });
  };

  const handleResetZoom = () => {
    setCustomWidth(null);
  };

  const totalWidth = columns.length * columnWidth;

  // Drag State
  const [draggingTask, setDraggingTask] = useState<{
    taskId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStartDate: string;
    initialEndDate: string;
  } | null>(null);

  const [hoveredTask, setHoveredTask] = useState<TaskWithLevel | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const timelineRef = useRef<HTMLDivElement>(null);

  // Auto Scroll to Today when jumpToTodaySignal is triggered
  const scrollToToday = () => {
    if (timelineRef.current && columns.length > 0) {
      const todayIndex = columns.findIndex((col) => col.isToday);
      if (todayIndex !== -1) {
        const todayX = todayIndex * columnWidth;
        const containerWidth = timelineRef.current.clientWidth;
        timelineRef.current.scrollTo({
          left: Math.max(0, todayX - containerWidth / 2 + columnWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  };

  useEffect(() => {
    if (jumpToTodaySignal && jumpToTodaySignal > 0) {
      scrollToToday();
    }
  }, [jumpToTodaySignal]);

  // Initial scroll to today once mounted
  const initialScrollDoneRef = useRef(false);
  useEffect(() => {
    if (!initialScrollDoneRef.current && columns.length > 0) {
      initialScrollDoneRef.current = true;
      setTimeout(() => {
        scrollToToday();
      }, 150);
    }
  }, [columns]);

  if (columns.length === 0) return null;

  const minDateStr = columns[0].dateStr;

  // Calculate pixel X coordinate for a given date
  const getXForDate = (dateStr: string): number => {
    const daysDiff = differenceInCalendarDays(parseDate(dateStr), parseDate(minDateStr));
    return daysDiff * columnWidth;
  };

  // Group columns by Month or Week for timeline headers
  const monthGroups: { label: string; count: number }[] = [];
  let currentMonth = '';
  let count = 0;

  columns.forEach((col) => {
    const month = col.monthLabel || '';
    if (month !== currentMonth) {
      if (currentMonth) {
        monthGroups.push({ label: currentMonth, count });
      }
      currentMonth = month;
      count = 1;
    } else {
      count++;
    }
  });
  if (currentMonth) {
    monthGroups.push({ label: currentMonth, count });
  }

  // Handle Dragging
  const handleMouseDown = (
    e: React.MouseEvent,
    task: TaskWithLevel,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectTask(task.id);

    setDraggingTask({
      taskId: task.id,
      type,
      startX: e.clientX,
      initialStartDate: task.startDate,
      initialEndDate: task.endDate,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTask) return;

    const deltaX = e.clientX - draggingTask.startX;
    const deltaDays = Math.round(deltaX / columnWidth);

    if (deltaDays === 0) return;

    if (draggingTask.type === 'move') {
      const newStart = addDaysToDate(draggingTask.initialStartDate, deltaDays);
      const newEnd = addDaysToDate(draggingTask.initialEndDate, deltaDays);
      onTaskDatesChange(draggingTask.taskId, newStart, newEnd);
    } else if (draggingTask.type === 'resize-left') {
      const newStart = addDaysToDate(draggingTask.initialStartDate, deltaDays);
      if (newStart <= draggingTask.initialEndDate) {
        onTaskDatesChange(draggingTask.taskId, newStart, draggingTask.initialEndDate);
      }
    } else if (draggingTask.type === 'resize-right') {
      const newEnd = addDaysToDate(draggingTask.initialEndDate, deltaDays);
      if (newEnd >= draggingTask.initialStartDate) {
        onTaskDatesChange(draggingTask.taskId, draggingTask.initialStartDate, newEnd);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingTask(null);
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col group">
      <div
        ref={timelineRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onScroll={onScroll}
        className="flex flex-col h-full overflow-x-auto overflow-y-auto bg-white/40 dark:bg-slate-950/40 relative select-none"
      >
        <div style={{ width: `${totalWidth}px` }} className="relative h-full flex flex-col">
        {/* Timeline Header (Months / Days Grid with Weekdays) */}
        <div className="sticky top-0 z-20 flex flex-col bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
          {/* Top Month Header Row */}
          <div className="h-6 flex border-b border-slate-200/50 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {monthGroups.map((group, idx) => (
              <div
                key={idx}
                style={{ width: `${group.count * columnWidth}px` }}
                className="px-2 flex items-center border-r border-slate-200/60 dark:border-slate-800 truncate"
              >
                {group.label}
              </div>
            ))}
          </div>

          {/* Bottom Days & Weekday Header Row */}
          <div className="h-8 flex text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            {columns.map((col, idx) => {
              const dayName = viewMode === 'day' ? col.dayOfWeek : (col.dayOfWeek ? col.dayOfWeek.replace('周', '') : '');
              return (
                <div
                  key={idx}
                  style={{ width: `${columnWidth}px` }}
                  className={`flex flex-col items-center justify-center border-r border-slate-200/40 dark:border-slate-800/60 leading-none py-0.5 shrink-0 ${
                    col.isToday
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold'
                      : col.isWeekend
                      ? 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                      : ''
                  }`}
                >
                  <span className="text-[11px] font-bold tracking-tight">{col.dayNumber}</span>
                  <span className={`text-[9px] mt-0.5 ${col.isWeekend ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid Content Area */}
        <div className="relative flex-1">
          {/* Background Column Grid Lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {columns.map((col, idx) => (
              <div
                key={idx}
                style={{ width: `${columnWidth}px` }}
                className={`h-full border-r border-slate-200/30 dark:border-slate-800/40 ${
                  col.isToday
                    ? 'bg-blue-500/5 border-r-blue-400/40'
                    : col.isWeekend
                    ? 'bg-slate-100/20 dark:bg-slate-900/20'
                    : ''
                }`}
              >
                {col.isToday && (
                  <div className="h-full border-l-2 border-dashed border-blue-500/70" />
                )}
              </div>
            ))}
          </div>

          {/* SVG Dependency Lines */}
          <DependencyArrows
            tasks={tasks}
            dependencies={dependencies}
            columns={columns}
            viewMode={viewMode}
            selectedTaskId={selectedTaskId}
            columnWidth={columnWidth}
            criticalPathSet={criticalPathSet}
            showCriticalPath={showCriticalPath}
          />

          {/* Task Gantt Bars List */}
          <div className="divide-y divide-slate-100/40 dark:divide-slate-800/20">
            {tasks.map((task) => {
              const startX = getXForDate(task.startDate);
              const endX = getXForDate(task.endDate) + columnWidth;
              const barWidth = Math.max(columnWidth, endX - startX);

              const colorOption = getColorById(task.colorId);
              const isSelected = selectedTaskId === task.id;
              const isCritical = showCriticalPath && criticalPathSet?.has(task.id);

              return (
                <div
                  key={task.id}
                  className="h-11 relative flex items-center"
                  onClick={() => onSelectTask(task.id)}
                >
                  {/* Gantt Bar */}
                  {task.isMilestone ? (
                    // Milestone Diamond Render
                    <div
                      style={{ left: `${startX + columnWidth / 2 - 12}px` }}
                      className="absolute z-10 cursor-pointer group flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                      onMouseEnter={(e) => {
                        setHoveredTask(task);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredTask(null)}
                    >
                      <div className="w-6 h-6 rotate-45 bg-amber-400 border-2 border-amber-600 shadow-md flex items-center justify-center transform hover:scale-110 transition-transform">
                        <Diamond className="w-3 h-3 text-white -rotate-45" />
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded-md border border-amber-300">
                        {task.title}
                      </span>
                    </div>
                  ) : task.hasChildren ? (
                    // Parent Summary Bar (Spans over subtasks)
                    <div
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      onMouseEnter={(e) => {
                        setHoveredTask(task);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredTask(null)}
                      className={`absolute h-6 rounded-md flex items-center justify-between px-1.5 cursor-grab active:cursor-grabbing transition-all border shadow-sm group ${
                        isSelected ? 'ring-2 ring-blue-500 z-20' : 'z-10 hover:shadow-md'
                      } ${isCritical ? 'ring-2 ring-rose-500 border-rose-500' : ''}`}
                      style={{
                        left: `${startX}px`,
                        width: `${barWidth}px`,
                        backgroundColor: colorOption.hex + '33',
                        borderColor: isCritical ? '#EF4444' : colorOption.hex,
                      }}
                    >
                      {/* Bracket End Caps */}
                      <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-slate-800 dark:bg-slate-200 rounded-l-xs" />
                      <div className="absolute -right-0.5 top-0 bottom-0 w-1 bg-slate-800 dark:bg-slate-200 rounded-r-xs" />

                      {/* Inner Progress Overlay */}
                      <div
                        className="absolute left-0 top-0 bottom-0 transition-all opacity-40 rounded-sm"
                        style={{
                          width: `${task.progress}%`,
                          backgroundColor: colorOption.hex,
                        }}
                      />

                      {/* Bar Text Label */}
                      <span className="relative z-10 text-[11px] font-extrabold text-slate-900 dark:text-slate-100 truncate px-1 pointer-events-none">
                        📁 {task.title}
                      </span>

                      <span className="relative z-10 text-[10px] font-mono opacity-80 pointer-events-none shrink-0 bg-white/70 dark:bg-slate-900/70 px-1 rounded">
                        {task.durationDays}天
                      </span>
                    </div>
                  ) : (
                    // Standard Liquid Glass Task Bar
                    <div
                      onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                      onMouseEnter={(e) => {
                        setHoveredTask(task);
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setHoveredTask(null)}
                      className={`absolute h-7 rounded-xl flex items-center justify-between px-2 cursor-grab active:cursor-grabbing transition-all border shadow-sm group ${
                        isSelected
                          ? 'ring-2 ring-blue-500 shadow-lg z-20'
                          : 'z-10 hover:shadow-md'
                      } ${isCritical ? 'ring-2 ring-rose-500 border-rose-500' : ''}`}
                      style={{
                        left: `${startX}px`,
                        width: `${barWidth}px`,
                        backgroundColor: colorOption.hex + '33',
                        borderColor: isCritical ? '#EF4444' : colorOption.hex + '88',
                      }}
                    >
                      {/* Inner Progress Overlay */}
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-xl transition-all opacity-40"
                        style={{
                          width: `${task.progress}%`,
                          backgroundColor: colorOption.hex,
                        }}
                      />

                      {/* Left Resize Handle */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-left')}
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        title="拖动调整开始时间"
                      />

                      {/* Bar Text Label */}
                      <span className="relative z-10 text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate px-1 pointer-events-none">
                        {task.title}
                      </span>

                      {/* Right Resize Handle */}
                      <div
                        onMouseDown={(e) => handleMouseDown(e, task, 'resize-right')}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        title="拖动调整结束时间"
                      />

                      {/* Dependency Link Connector Dot */}
                      {onStartConnectDependency && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartConnectDependency(task.id);
                          }}
                          className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-125 z-30"
                          title="点击连接到后置任务创建联动关系"
                        >
                          <LinkIcon className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      {/* Hover Glass Tooltip */}
      {hoveredTask && (
        <div
          style={{
            left: `${Math.min(window.innerWidth - 250, tooltipPos.x + 15)}px`,
            top: `${Math.min(window.innerHeight - 150, tooltipPos.y + 15)}px`,
          }}
          className="fixed z-50 p-3 rounded-2xl liquid-glass text-xs shadow-xl border border-white/80 dark:border-slate-700 space-y-1.5 w-56 pointer-events-none"
        >
          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
            {hoveredTask.title}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" /> {hoveredTask.startDate} 至 {hoveredTask.endDate} ({hoveredTask.durationDays}天)
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <User className="w-3 h-3 text-emerald-500" /> 责任人: {hoveredTask.assignee || '未分配'}
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-800">
            <span className="text-slate-500">完成度: {hoveredTask.progress}%</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {hoveredTask.status === 'completed' ? '已完成' : '进行中'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Column Width Zoom Controller */}
      <div
        id="gantt-column-width-controls"
        className="absolute bottom-4 right-5 z-40 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 shadow-2xl rounded-full p-1.5 px-2 text-xs select-none transition-all duration-200 hover:scale-105"
      >
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium pl-1 hidden sm:inline">列宽</span>
        <button
          onClick={handleZoomOut}
          disabled={columnWidth <= minWidth}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 shadow-xs"
          title="缩小列宽 ( - )"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetZoom}
          className="px-2 py-1 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all flex items-center gap-1"
          title="点击重置为默认列宽"
        >
          <span>{columnWidth}px</span>
          {customWidth !== null && <RotateCcw className="w-2.5 h-2.5 text-slate-400" />}
        </button>

        <button
          onClick={handleZoomIn}
          disabled={columnWidth >= maxWidth}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 shadow-xs"
          title="放大列宽 ( + )"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
