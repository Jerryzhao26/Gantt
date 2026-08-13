import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Project, Dependency, TaskStatus, TaskPriority, DependencyType } from '../../types';
import { COLOR_PALETTE } from '../../utils/colorPalette';
import { addDaysToDate, daysBetween } from '../../utils/dateUtils';
import { syncTaskStatusAndProgress } from '../../utils/statusUtils';
import { X, Calendar, User, CheckCircle2, Link, Plus, Trash2, Tag, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task, newDependencies: Dependency[]) => void;
  onDelete?: (taskId: string) => void;
  taskToEdit?: Task | null;
  parentTaskId?: string | null;
  projects: Project[];
  activeProjectId: string;
  allTasks: Task[];
  existingDependencies: Dependency[];
}

export const TaskModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  taskToEdit,
  parentTaskId,
  projects,
  activeProjectId,
  allTasks,
  existingDependencies,
}) => {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId);
  const [parentId, setParentId] = useState<string | null>(parentTaskId || null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [colorId, setColorId] = useState('azure');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Local state for dependencies on this task
  const [taskDeps, setTaskDeps] = useState<{ fromTaskId: string; type: DependencyType; lagDays: number }[]>([]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setProjectId(taskToEdit.projectId);
      setParentId(taskToEdit.parentId);
      setStartDate(taskToEdit.startDate);
      setEndDate(taskToEdit.endDate);
      setProgress(taskToEdit.progress);
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setColorId(taskToEdit.colorId || 'azure');
      setAssignee(taskToEdit.assignee || '');
      setNotes(taskToEdit.notes || '');
      setIsMilestone(taskToEdit.isMilestone || false);
      setIsConfirmingDelete(false);

      // Load predecessors
      const preds = existingDependencies
        .filter((d) => d.toTaskId === taskToEdit.id)
        .map((d) => ({
          fromTaskId: d.fromTaskId,
          type: d.type || 'FS',
          lagDays: d.lagDays || 0,
        }));
      setTaskDeps(preds);
    } else {
      // New Task default values
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setProjectId(activeProjectId);
      setParentId(parentTaskId || null);

      if (parentTaskId) {
        const existingSubtasks = allTasks.filter((t) => t.parentId === parentTaskId);
        if (existingSubtasks.length > 0) {
          const maxEndDate = existingSubtasks.reduce(
            (max, t) => (t.endDate > max ? t.endDate : max),
            existingSubtasks[0].endDate
          );
          const start = addDaysToDate(maxEndDate, 1);
          setStartDate(start);
          setEndDate(start); // 1 day length
        } else {
          const parentTask = allTasks.find((t) => t.id === parentTaskId);
          if (parentTask) {
            setStartDate(parentTask.startDate);
            setEndDate(parentTask.startDate); // 1 day length
          } else {
            setStartDate(today);
            setEndDate(today);
          }
        }
      } else {
        setStartDate(today);
        setEndDate(addDaysToDate(today, 3));
      }

      setProgress(0);
      setStatus('todo');
      setPriority('medium');
      setColorId('azure');
      setAssignee('');
      setNotes('');
      setIsMilestone(false);
      setTaskDeps([]);
    }
  }, [taskToEdit, parentTaskId, activeProjectId, isOpen, existingDependencies]);

  if (!isOpen) return null;

  // Auto-update end date when start date or duration changes
  const duration = daysBetween(startDate, endDate);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    if (newStart > endDate) {
      setEndDate(addDaysToDate(newStart, duration - 1));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = Math.max(1, parseInt(e.target.value) || 1);
    setEndDate(addDaysToDate(startDate, days - 1));
  };

  // Status Change with Progress Auto Sync
  const handleStatusChange = (newStatus: TaskStatus) => {
    const dummyTask: Task = {
      id: 'temp',
      projectId,
      parentId: parentId || null,
      title,
      startDate,
      endDate,
      durationDays: duration,
      progress,
      status: newStatus,
      priority,
      colorId,
      order: 0,
    };

    const synced = syncTaskStatusAndProgress(dummyTask, { status: newStatus });
    setStatus(synced.status);
    setProgress(synced.progress);
  };

  // Progress Change with Status Auto Sync
  const handleProgressChange = (newProgress: number) => {
    const dummyTask: Task = {
      id: 'temp',
      projectId,
      parentId: parentId || null,
      title,
      startDate,
      endDate,
      durationDays: duration,
      progress: newProgress,
      status,
      priority,
      colorId,
      order: 0,
    };

    const synced = syncTaskStatusAndProgress(dummyTask, { progress: newProgress });
    setStatus(synced.status);
    setProgress(synced.progress);
  };

  const handleAddDependency = () => {
    const candidateTasks = allTasks.filter(
      (t) => t.id !== taskToEdit?.id && !taskDeps.some((d) => d.fromTaskId === t.id)
    );
    if (candidateTasks.length > 0) {
      setTaskDeps([...taskDeps, { fromTaskId: candidateTasks[0].id, type: 'FS', lagDays: 0 }]);
    }
  };

  const handleRemoveDependency = (index: number) => {
    setTaskDeps(taskDeps.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const currentTaskId = taskToEdit ? taskToEdit.id : `task-${Date.now()}`;

    const rawTask: Task = {
      id: currentTaskId,
      projectId,
      parentId: parentId === 'none' ? null : parentId,
      title: title.trim(),
      startDate,
      endDate,
      durationDays: daysBetween(startDate, endDate),
      progress,
      status,
      priority,
      colorId,
      assignee: assignee.trim() || undefined,
      notes: notes.trim() || undefined,
      isMilestone,
      expanded: taskToEdit ? taskToEdit.expanded : true,
      order: taskToEdit ? taskToEdit.order : Date.now(),
    };

    const taskData = syncTaskStatusAndProgress(rawTask, {});

    const newDependencies: Dependency[] = taskDeps.map((d, index) => ({
      id: `dep-${currentTaskId}-${d.fromTaskId}-${index}`,
      fromTaskId: d.fromTaskId,
      toTaskId: currentTaskId,
      type: d.type,
      lagDays: d.lagDays,
    }));

    onSave(taskData, newDependencies);
    onClose();
  };

  // Potential parent tasks (exclude self and own children to prevent circular references)
  const availableParents = allTasks.filter((t) => t.id !== taskToEdit?.id && t.projectId === projectId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl liquid-glass rounded-3xl p-6 shadow-2xl my-8 border border-white/60 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>{taskToEdit ? '编辑任务详情' : parentTaskId ? '新增子任务' : '创建新任务'}</span>
                  {(() => {
                    const activeParent = allTasks.find((t) => t.id === (parentId || parentTaskId));
                    return activeParent ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold border border-blue-400/30">
                        所属主任务: {activeParent.title}
                      </span>
                    ) : null;
                  })()}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  设定工期、色块标识、责任人与前置联动关系
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Task Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                任务名称 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="输入任务或子任务名称..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
              />
            </div>

            {/* Project & Parent Task selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  所属项目
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  父层级任务 (归属父节点)
                </label>
                <select
                  value={parentId || 'none'}
                  onChange={(e) => {
                    const newParentVal = e.target.value === 'none' ? null : e.target.value;
                    setParentId(newParentVal);
                    if (!taskToEdit) {
                      const today = new Date().toISOString().split('T')[0];
                      if (newParentVal) {
                        const existingSubtasks = allTasks.filter((t) => t.parentId === newParentVal);
                        if (existingSubtasks.length > 0) {
                          const maxEndDate = existingSubtasks.reduce(
                            (max, t) => (t.endDate > max ? t.endDate : max),
                            existingSubtasks[0].endDate
                          );
                          const start = addDaysToDate(maxEndDate, 1);
                          setStartDate(start);
                          setEndDate(start);
                        } else {
                          const parentTask = allTasks.find((t) => t.id === newParentVal);
                          if (parentTask) {
                            setStartDate(parentTask.startDate);
                            setEndDate(parentTask.startDate);
                          } else {
                            setStartDate(today);
                            setEndDate(today);
                          }
                        }
                      } else {
                        setStartDate(today);
                        setEndDate(addDaysToDate(today, 3));
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="none">无 (作为独立主任务)</option>
                  {availableParents.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.parentId ? '└ ' : ''}
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates & Duration */}
            <div className="p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-500" /> 时间规划与工期 (按天)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    结束日期
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    工期 (天数)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={handleDurationChange}
                      className="w-full px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      天
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Fresh Color Block Palette (清新淡雅色块选择) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> 任务色块 (淡雅视觉标识)
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  选择亮眼淡雅的色块可提升甘特图辨识度
                </span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorId(c.id)}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border ${
                      colorId === c.id
                        ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 border-transparent scale-105 shadow-md'
                        : 'border-slate-200/60 dark:border-slate-800 hover:scale-102 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex + '22' }}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress, Status, Priority & Assignee */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  责任人 / 实施者
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="输入名字，如 张工"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  任务状态 (联动进度)
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                >
                  <option value="todo">未开始 (0%)</option>
                  <option value="in_progress">进行中 (50%)</option>
                  <option value="completed">已完成 (100%)</option>
                  <option value="blocked">已阻塞 (自动顺延)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  优先级
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="low">普通 (Low)</option>
                  <option value="medium">中等 (Medium)</option>
                  <option value="high">高优先级 (High)</option>
                  <option value="urgent">紧急 (Urgent)</option>
                </select>
              </div>
            </div>

            {/* Progress Slider & Milestone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>完成进度 ({progress}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progress}
                  onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 sm:pt-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMilestone}
                    onChange={(e) => setIsMilestone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  <span className="ml-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                    设为里程碑节点 (◆)
                  </span>
                </label>
              </div>
            </div>

            {/* Dependencies (前置联动任务) */}
            <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-blue-500" /> 前置联动依赖设置 (此任务依赖于...)
                </span>
                <button
                  type="button"
                  onClick={handleAddDependency}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> 添加前置任务
                </button>
              </div>

              {taskDeps.length === 0 ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                  暂无前置联动任务。添加后，当前置任务推迟时，本任务将自动同步推迟。
                </div>
              ) : (
                <div className="space-y-2">
                  {taskDeps.map((dep, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200/70 dark:border-slate-700 text-xs"
                    >
                      <span className="text-slate-400">依赖于:</span>
                      <select
                        value={dep.fromTaskId}
                        onChange={(e) => {
                          const updated = [...taskDeps];
                          updated[index].fromTaskId = e.target.value;
                          setTaskDeps(updated);
                        }}
                        className="flex-1 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                      >
                        {allTasks
                          .filter((t) => t.id !== taskToEdit?.id)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({t.startDate})
                            </option>
                          ))}
                      </select>

                      <select
                        value={dep.type}
                        onChange={(e) => {
                          const updated = [...taskDeps];
                          updated[index].type = e.target.value as DependencyType;
                          setTaskDeps(updated);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs"
                      >
                        <option value="FS">完成-开始 (FS)</option>
                        <option value="SS">开始-开始 (SS)</option>
                        <option value="FF">完成-完成 (FF)</option>
                      </select>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">间隔:</span>
                        <input
                          type="number"
                          value={dep.lagDays}
                          onChange={(e) => {
                            const updated = [...taskDeps];
                            updated[index].lagDays = parseInt(e.target.value) || 0;
                            setTaskDeps(updated);
                          }}
                          className="w-12 px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs text-center"
                        />
                        <span className="text-slate-400">天</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(index)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                备注 / 任务说明
              </label>
              <textarea
                rows={2}
                placeholder="添加任务补充细节..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
              {taskToEdit && onDelete ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">确定删除此任务及所有子任务？</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(taskToEdit.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
                    >
                      确认删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-4 py-2 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> 删除此任务
                  </button>
                )
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> 保存修改
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
