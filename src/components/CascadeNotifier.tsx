import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CascadeChangeLog } from '../types';
import { Sparkles, ArrowRight, X, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
  logs: CascadeChangeLog[];
  onDismiss: () => void;
  onUndo?: () => void;
}

export const CascadeNotifier: React.FC<Props> = ({ logs, onDismiss, onUndo }) => {
  if (logs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-full liquid-glass rounded-2xl p-4 shadow-2xl border border-blue-400/30 dark:border-blue-500/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-semibold">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                已自动顺延推迟 {logs.length} 个关联任务
              </h4>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                按任务前置联动依赖规则自动更新工程计划
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1 text-xs">
          {logs.map((log, index) => (
            <div
              key={index}
              className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {log.taskTitle}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>{log.oldStartDate}</span>
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {log.newStartDate}
                  </span>
                  <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    +{log.shiftedDays}天
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> 点击任务可调整联动配置
          </span>
          <div className="flex gap-2">
            {onUndo && (
              <button
                onClick={onUndo}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-lg flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> 撤销
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-3 py-1 text-xs font-medium bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
            >
              确定
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
