import React from 'react';
import { Task } from '../types';
import { isTaskOverdue } from '../utils/statusUtils';
import { AlertCircle, ShieldAlert, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface Props {
  tasks: Task[];
  onOpenCategoryModal: (categoryKey: 'overdue' | 'blocked' | 'completed' | 'in_progress' | 'all') => void;
}

export const KanbanDashboard: React.FC<Props> = ({ tasks, onOpenCategoryModal }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const overdueCount = tasks.filter((t) => isTaskOverdue(t, todayStr)).length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const completedCount = tasks.filter((t) => t.status === 'completed' || t.progress === 100).length;
  const inProgressCount = tasks.filter(
    (t) => t.progress > 0 && t.progress < 100 && t.status !== 'blocked'
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {/* 🔴 已过期任务 */}
      <div
        onClick={() => onOpenCategoryModal('overdue')}
        className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${
          overdueCount > 0
            ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/30 text-rose-900 dark:text-rose-200 hover:border-rose-500/60'
            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
            已过期任务
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            overdueCount > 0 ? 'bg-rose-500 text-white' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
          }`}>
            {overdueCount} 项
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-80 group-hover:opacity-100">
          <span>{overdueCount > 0 ? '包含超时未交付事项' : '暂无过期风险'}</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* 🟠 已阻塞任务 */}
      <div
        onClick={() => onOpenCategoryModal('blocked')}
        className={`group p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${
          blockedCount > 0
            ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:border-amber-500/60'
            : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <ShieldAlert className={`w-4 h-4 ${blockedCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
            已阻塞任务
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            blockedCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
          }`}>
            {blockedCount} 项
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-80 group-hover:opacity-100">
          <span>{blockedCount > 0 ? '依赖阻塞，自动每天延后' : '无阻塞链路'}</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* 🟢 已完成任务 */}
      <div
        onClick={() => onOpenCategoryModal('completed')}
        className="group p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 hover:border-emerald-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            已完成任务
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
            {completedCount} 项
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-80 group-hover:opacity-100">
          <span>100% 进度履约</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

      {/* 🔵 进行中任务 */}
      <div
        onClick={() => onOpenCategoryModal('in_progress')}
        className="group p-3.5 rounded-2xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 text-blue-900 dark:text-blue-200 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            进行中任务
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">
            {inProgressCount} 项
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] opacity-80 group-hover:opacity-100">
          <span>积极推进中</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
