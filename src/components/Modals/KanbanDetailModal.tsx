import React, { useState } from 'react';
import { Task, Project, Dependency } from '../../types';
import { isTaskOverdue } from '../../utils/statusUtils';
import { getColorById } from '../../utils/colorPalette';
import {
  X,
  AlertCircle,
  ShieldAlert,
  CheckCircle,
  Clock,
  ArrowRight,
  Edit2,
  Calendar,
  User,
  Zap,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCategory: 'overdue' | 'blocked' | 'completed' | 'in_progress' | 'all';
  tasks: Task[];
  projects: Project[];
  dependencies: Dependency[];
  onSelectAndLocateTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onToggleBlocked: (taskId: string, currentStatus: string) => void;
  onDelayTask: (taskId: string) => void;
  onBatchDelayBlocked: () => void;
}

export const KanbanDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialCategory,
  tasks,
  projects,
  dependencies,
  onSelectAndLocateTask,
  onEditTask,
  onToggleBlocked,
  onDelayTask,
  onBatchDelayBlocked,
}) => {
  const [activeTab, setActiveTab] = useState<'overdue' | 'blocked' | 'completed' | 'in_progress' | 'all'>(
    initialCategory
  );

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter tasks based on activeTab
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t, todayStr));
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const completedTasks = tasks.filter((t) => t.status === 'completed' || t.progress === 100);
  const inProgressTasks = tasks.filter(
    (t) => t.progress > 0 && t.progress < 100 && t.status !== 'blocked'
  );

  let displayedTasks = tasks;
  if (activeTab === 'overdue') displayedTasks = overdueTasks;
  if (activeTab === 'blocked') displayedTasks = blockedTasks;
  if (activeTab === 'completed') displayedTasks = completedTasks;
  if (activeTab === 'in_progress') displayedTasks = inProgressTasks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 px-6 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              📋 任务状态看板二级分类明细
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              按状态筛选并管理具体任务，一键处理阻塞、超时延后与甘特图定位
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-2xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons & Batch Operations */}
        <div className="p-3 px-6 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              全部任务 ({tasks.length})
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'overdue'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" /> 已过期 ({overdueCount(overdueTasks.length)})
            </button>

            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'blocked'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> 已阻塞 ({blockedTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'completed'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> 已完成 ({completedTasks.length})
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                activeTab === 'in_progress'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> 进行中 ({inProgressTasks.length})
            </button>
          </div>

          {/* Batch Delay Blocked Tasks Button */}
          {blockedTasks.length > 0 && (
            <button
              onClick={onBatchDelayBlocked}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1"
              title="将所有已阻塞的任务及其关联后置任务全部自动推迟 1 天"
            >
              <Zap className="w-3.5 h-3.5" /> 批量阻塞顺延 +1d
            </button>
          )}
        </div>

        {/* Task List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {displayedTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              当前状态下暂无任务
            </div>
          ) : (
            displayedTasks.map((t) => {
              const project = projects.find((p) => p.id === t.projectId);
              const colorOption = getColorById(t.colorId);
              const isOverdue = isTaskOverdue(t, todayStr);
              const isBlocked = t.status === 'blocked';

              // Count predecessors
              const predCount = dependencies.filter((dep) => dep.toTaskId === t.id).length;

              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: colorOption.hex }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {t.title}
                        </span>
                        {project && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {project.name}
                          </span>
                        )}
                        {predCount > 0 && (
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            🔗 {predCount} 个前置依赖
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {t.startDate} ~ {t.endDate} ({t.durationDays}天)
                        </span>
                        {t.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {t.assignee}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges & Actions */}
                  <div className="flex items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/50 dark:border-slate-800">
                    {/* Status Pill */}
                    {isBlocked ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-500" /> 已阻塞
                      </span>
                    ) : isOverdue ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" /> 已超时过期
                      </span>
                    ) : t.status === 'completed' || t.progress === 100 ? (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-500" /> 100% 已完成
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-500" /> {t.progress}% 进行中
                      </span>
                    )}

                    {/* Quick Action Buttons */}
                    <button
                      onClick={() => onDelayTask(t.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                      title="单独将此任务及后置链路延后 1 天"
                    >
                      <Zap className="w-3 h-3 text-amber-500 group-hover:text-white" /> 顺延+1d
                    </button>

                    <button
                      onClick={() => onToggleBlocked(t.id, t.status)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        isBlocked
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                      }`}
                    >
                      {isBlocked ? '解除阻塞' : '设为阻塞'}
                    </button>

                    <button
                      onClick={() => {
                        onSelectAndLocateTask(t.id);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                      title="定位到甘特图"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> 定位
                    </button>

                    <button
                      onClick={() => {
                        onEditTask(t);
                        onClose();
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="编辑任务"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

function overdueCount(val: number) {
  return val;
}
