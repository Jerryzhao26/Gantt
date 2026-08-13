import React, { useState, useRef, useEffect } from 'react';
import { TaskWithLevel } from '../../utils/dependencyEngine';
import { Dependency, TaskStatus } from '../../types';
import { getColorById } from '../../utils/colorPalette';
import {
  ChevronRight,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Plus,
  ArrowRightToLine,
  ArrowLeftToLine,
  Edit2,
  Trash2,
  Diamond,
  Layers,
  Link as LinkIcon,
  X,
  Search,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Circle,
  Zap,
  FolderOpen,
  FolderClosed,
} from 'lucide-react';

interface Props {
  tasks: TaskWithLevel[];
  allFlatTasks: TaskWithLevel[];
  dependencies: Dependency[];
  selectedTaskId: string | null;
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
  onQuickTogglePredecessor: (targetTaskId: string, predecessorTaskId: string) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onQuickUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onQuickUpdateProgress: (taskId: string, newProgress: number) => void;
  onDelayBlockedTask: (taskId: string) => void;
}

export const TaskList: React.FC<Props> = ({
  tasks,
  allFlatTasks,
  dependencies,
  selectedTaskId,
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
  onQuickTogglePredecessor,
  onRemoveDependency,
  onQuickUpdateStatus,
  onQuickUpdateProgress,
  onDelayBlockedTask,
}) => {
  const [inlineTitle, setInlineTitle] = useState('');
  const [activeInlineParentId, setActiveInlineParentId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Predecessor Quick Popover State
  const [activePredPopoverId, setActivePredPopoverId] = useState<string | null>(null);
  const [predSearchQuery, setPredSearchQuery] = useState('');

  // Status Selector Dropdown State
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePredPopoverId(null);
        setActiveStatusDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inlineTitle.trim()) {
      onQuickInlineAdd(inlineTitle.trim(), activeInlineParentId);
      setInlineTitle('');
    }
  };

  const hasExpandedParents = allFlatTasks.some((t) => t.hasChildren && t.expanded !== false);

  return (
    <div className="flex flex-col h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-r border-slate-200/60 dark:border-slate-800/80 text-xs select-none">
      {/* Task List Header */}
      <div className="h-12 px-3 flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-slate-900 dark:text-slate-100">
            任务树 ({tasks.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* One-Click Collapse/Expand All Button */}
          {onToggleCollapseAll && (
            <button
              onClick={onToggleCollapseAll}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-700/80 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
              title={hasExpandedParents ? '一键收起所有主任务下的子任务' : '一键展开所有主任务下的子任务'}
            >
              {hasExpandedParents ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5 text-blue-500" />
                  <span>一键收起</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5 text-blue-500" />
                  <span>一键展开</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onAddRootTask}
            className="px-2.5 py-1 text-[11px] font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 transition-all shadow-sm"
            title="新增顶层主任务"
          >
            <Plus className="w-3.5 h-3.5" /> ＋主任务
          </button>
        </div>
      </div>

      {/* Columns Header Bar */}
      <div className="h-8 px-3 flex items-center bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
        <div className="flex-1 min-w-[130px]">任务名称与树结构</div>
        <div className="w-28 text-center hidden sm:block">前置依赖</div>
        <div className="w-14 text-center hidden md:block">责任人</div>
        <div className="w-24 text-center">状态 / 进度</div>
        <div className="w-24 text-right pr-2">操作</div>
      </div>

      {/* Task Rows List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/40">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            暂无任务，点击右上角「＋主任务」开始创建
          </div>
        ) : (
          tasks.map((task) => {
            const isSelected = selectedTaskId === task.id;
            const colorOption = getColorById(task.colorId);

            // Get subtasks count
            const directSubtaskCount = allFlatTasks.filter((t) => t.parentId === task.id).length;
            const isMainTask = task.level === 0 || task.hasChildren;

            // Get predecessors for this task
            const incomingDeps = dependencies.filter((d) => d.toTaskId === task.id);

            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`group h-11 px-3 flex items-center transition-all cursor-pointer relative ${
                  isMainTask
                    ? 'bg-slate-100/70 dark:bg-slate-800/50 font-bold border-l-4 border-l-blue-500'
                    : 'bg-white/40 dark:bg-slate-900/30 hover:bg-blue-50/50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                } ${
                  isSelected
                    ? '!bg-blue-500/15 dark:!bg-blue-500/25 !border-l-blue-600 shadow-2xs font-semibold'
                    : ''
                }`}
              >
                {/* Indentation & Tree Expand Toggle & Title */}
                <div
                  className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden pr-2"
                  style={{ paddingLeft: `${task.level * 16}px` }}
                >
                  {/* Tree connector branch graphics for subtasks */}
                  {task.level > 0 && (
                    <div className="flex items-center text-slate-400 dark:text-slate-500 shrink-0 text-[11px] font-mono select-none mr-0.5">
                      <span className="text-slate-300 dark:text-slate-600 mr-1">│</span>
                      <span>└─</span>
                    </div>
                  )}

                  {task.hasChildren ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                      }}
                      className="p-1 rounded-md bg-slate-200/60 dark:bg-slate-700/60 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                      title={task.expanded !== false ? '点击一键收起下属子任务' : '点击展开查看子任务'}
                    >
                      {task.expanded !== false ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : task.level === 0 ? (
                    <span className="w-5 flex justify-center text-slate-400">
                      <FolderClosed className="w-3.5 h-3.5" />
                    </span>
                  ) : null}

                  {/* Color Badge Indicator */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: colorOption.hex }}
                    title={`色块: ${colorOption.name}`}
                  />

                  {/* Milestone or Title */}
                  {task.isMilestone && (
                    <Diamond className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  )}

                  <span
                    className={`truncate ${
                      isMainTask
                        ? 'font-extrabold text-[12px] text-slate-900 dark:text-slate-100'
                        : 'text-[11.5px] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {task.title}
                  </span>

                  {/* Subtask count badge */}
                  {directSubtaskCount > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(task.id);
                      }}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 shrink-0 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                      title="下属子任务数量 (点击切换展开/收起)"
                    >
                      {task.expanded !== false ? `📁 ${directSubtaskCount}` : `📁 ${directSubtaskCount} (已收起)`}
                    </span>
                  )}

                  {/* Direct Hover "+子任务" Quick Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubtask(task.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 rounded-md border border-blue-200 dark:border-blue-800 shadow-2xs shrink-0 flex items-center gap-0.5"
                    title={`快捷在此主任务【${task.title}】下新增子任务`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>+子任务</span>
                  </button>
                </div>

                {/* 🔗 Predecessors Column */}
                <div
                  className="w-28 hidden sm:flex items-center justify-center gap-1 overflow-x-auto no-scrollbar relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {incomingDeps.length > 0 ? (
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                      {incomingDeps.map((dep) => {
                        const predTask = allFlatTasks.find((t) => t.id === dep.fromTaskId);
                        return (
                          <span
                            key={dep.id}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 flex items-center gap-1 shrink-0"
                            title={`前置: ${predTask?.title || dep.fromTaskId}`}
                          >
                            <span className="truncate max-w-[50px]">{predTask?.title || '前置'}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDependency(dep.id);
                              }}
                              className="text-blue-400 hover:text-rose-500 font-bold ml-0.5"
                              title="移除此前置依赖"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePredPopoverId(activePredPopoverId === task.id ? null : task.id);
                          setPredSearchQuery('');
                        }}
                        className="p-1 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors shrink-0 text-[10px]"
                        title="增加更多前置任务"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePredPopoverId(activePredPopoverId === task.id ? null : task.id);
                        setPredSearchQuery('');
                      }}
                      className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-0.5"
                      title="点击直接添加前置任务"
                    >
                      <LinkIcon className="w-2.5 h-2.5" /> ＋前置
                    </button>
                  )}

                  {/* Predecessor Quick Popover Box */}
                  {activePredPopoverId === task.id && (
                    <div
                      ref={popoverRef}
                      className="absolute top-9 left-0 z-40 w-52 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl animate-fade-in text-slate-800 dark:text-slate-200"
                    >
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1 px-1">
                        选择前置依赖任务:
                      </div>
                      <div className="relative mb-2">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                        <input
                          type="text"
                          placeholder="搜索候选任务..."
                          value={predSearchQuery}
                          onChange={(e) => setPredSearchQuery(e.target.value)}
                          className="w-full pl-6 pr-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] focus:outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {allFlatTasks
                          .filter((t) => t.id !== task.id && t.projectId === task.projectId)
                          .filter((t) =>
                            predSearchQuery
                              ? t.title.toLowerCase().includes(predSearchQuery.toLowerCase())
                              : true
                          )
                          .map((candidate) => {
                            const isLinked = incomingDeps.some((d) => d.fromTaskId === candidate.id);
                            return (
                              <button
                                key={candidate.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickTogglePredecessor(task.id, candidate.id);
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between transition-colors ${
                                  isLinked
                                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className="truncate pr-1">{candidate.title}</span>
                                {isLinked && <span className="text-[10px] font-bold">✓</span>}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div className="w-14 text-center hidden md:block truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {task.assignee || '-'}
                </div>

                {/* Status / Progress Cell */}
                <div
                  className="w-24 flex items-center justify-center gap-1 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setActiveStatusDropdownId(
                        activeStatusDropdownId === task.id ? null : task.id
                      )
                    }
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      task.status === 'blocked'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40 shadow-xs'
                        : task.status === 'completed' || task.progress === 100
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30'
                        : task.progress > 0
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {task.status === 'blocked' ? (
                      <>
                        <ShieldAlert className="w-3 h-3 text-amber-500" /> 已阻塞
                      </>
                    ) : task.status === 'completed' || task.progress === 100 ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 100%
                      </>
                    ) : task.progress > 0 ? (
                      <>
                        <Clock className="w-3 h-3 text-blue-500" /> {task.progress}%
                      </>
                    ) : (
                      <>
                        <Circle className="w-3 h-3 text-slate-400" /> 未开始
                      </>
                    )}
                  </button>

                  {task.status === 'blocked' && (
                    <button
                      onClick={() => onDelayBlockedTask(task.id)}
                      className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 hover:bg-amber-500 hover:text-white transition-colors"
                      title="点击一键延长阻塞 1 天并自动推迟关联后置任务"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                    </button>
                  )}

                  {activeStatusDropdownId === task.id && (
                    <div
                      ref={popoverRef}
                      className="absolute top-9 right-0 z-40 w-36 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl animate-fade-in space-y-1 text-slate-800 dark:text-slate-200"
                    >
                      <button
                        onClick={() => {
                          onQuickUpdateStatus(task.id, 'todo');
                          setActiveStatusDropdownId(null);
                        }}
                        className="w-full px-2 py-1 rounded-xl text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5"
                      >
                        <Circle className="w-3 h-3 text-slate-400" /> 未开始 (0%)
                      </button>

                      <button
                        onClick={() => {
                          onQuickUpdateStatus(task.id, 'in_progress');
                          setActiveStatusDropdownId(null);
                        }}
                        className="w-full px-2 py-1 rounded-xl text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3 text-blue-500" /> 进行中 (50%)
                      </button>

                      <button
                        onClick={() => {
                          onQuickUpdateStatus(task.id, 'blocked');
                          setActiveStatusDropdownId(null);
                        }}
                        className="w-full px-2 py-1 rounded-xl text-left text-[11px] font-bold hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-500" /> 已阻塞 (自动延后)
                      </button>

                      <button
                        onClick={() => {
                          onQuickUpdateStatus(task.id, 'completed');
                          setActiveStatusDropdownId(null);
                        }}
                        className="w-full px-2 py-1 rounded-xl text-left text-[11px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> 已完成 (100%)
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Row Action Buttons */}
                <div className="w-24 flex items-center justify-end gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {/* Convenient Add Subtask Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubtask(task.id);
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 rounded-lg transition-colors"
                    title="在此任务下添加子任务"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOutdentTask(task.id);
                    }}
                    disabled={task.level === 0}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg transition-colors"
                    title="提升层级 (Outdent)"
                  >
                    <ArrowLeftToLine className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIndentTask(task.id);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
                    title="降级为子任务 (Indent)"
                  >
                    <ArrowRightToLine className="w-3 h-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTask(task);
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="编辑任务"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === task.id ? (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onDeleteTask(task.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-md shadow-xs transition-colors"
                        title="确认彻底删除任务"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-md transition-colors"
                        title="取消"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(task.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="删除任务"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Convenient Inline Quick Task Adder with Target Selector */}
      <div className="p-2.5 bg-slate-100/90 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400">
          {selectedTaskId ? (
            <div className="flex items-center gap-1 truncate">
              <span className="text-slate-400 shrink-0">添加目标:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                【{allFlatTasks.find((t) => t.id === selectedTaskId)?.title || '选中任务'}】的子任务
              </span>
              <button
                onClick={() => onSelectTask('')}
                className="text-[9.5px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline ml-1 shrink-0"
                title="取消选中，切换为新建独立主任务"
              >
                切为独立主任务
              </button>
            </div>
          ) : (
            <span className="text-slate-400">💡 提示：在上方列表中点击任一主任务，即可在此快捷注入子任务</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={
              selectedTaskId
                ? `快捷输入子任务名称 (按 Enter 保存到选中任务下)...`
                : "快捷新建主任务 (按 Enter 保存)..."
            }
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inlineTitle.trim()) {
                onQuickInlineAdd(inlineTitle.trim(), selectedTaskId);
                setInlineTitle('');
              }
            }}
            className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner"
          />
          <button
            onClick={() => {
              if (inlineTitle.trim()) {
                onQuickInlineAdd(inlineTitle.trim(), selectedTaskId);
                setInlineTitle('');
              }
            }}
            disabled={!inlineTitle.trim()}
            className="px-3 py-1.5 text-xs font-bold bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {selectedTaskId ? '+ 子任务' : '+ 快捷新建'}
          </button>
        </div>
      </div>
    </div>
  );
};

