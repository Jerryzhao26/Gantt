import React from 'react';
import { Project, ViewMode, FilterOptions } from '../types';
import { getColorById } from '../utils/colorPalette';
import {
  Sparkles,
  Plus,
  Calendar,
  Layers,
  FolderPlus,
  Edit,
  Download,
  Sun,
  Moon,
  Search,
  CheckCircle,
  Clock,
  Activity,
  Zap,
} from 'lucide-react';

interface Props {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenProjectModal: (projectToEdit?: Project) => void;
  onOpenTaskModal: () => void;
  onOpenExportModal: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  autoCascade: boolean;
  onToggleAutoCascade: () => void;
  showCriticalPath: boolean;
  onToggleCriticalPath: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  filterOptions: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onJumpToToday: () => void;
}

export const Header: React.FC<Props> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProjectModal,
  onOpenTaskModal,
  onOpenExportModal,
  viewMode,
  onChangeViewMode,
  autoCascade,
  onToggleAutoCascade,
  showCriticalPath,
  onToggleCriticalPath,
  isDarkMode,
  onToggleDarkMode,
  filterOptions,
  onFilterChange,
  onJumpToToday,
}) => {
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const projectColor = activeProject ? getColorById(activeProject.colorId) : getColorById('azure');

  return (
    <header className="mb-4 space-y-3">
      {/* Top Glass Navigation Bar */}
      <div className="liquid-glass rounded-3xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-4 border border-white/60 dark:border-white/10 shadow-xl">
        {/* Logo & Project Picker */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Liquid Gantt
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  苹果玻璃拟态
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                支持智能多级子任务与延迟联动算法
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Project Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 p-1 pl-3 pr-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: projectColor.hex }}
              />
              <select
                value={activeProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-2"
              >
                <option value="all">⚡ 所有工程全图联动视图 ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.name}
                  </option>
                ))}
              </select>
            </div>

            {activeProject && activeProjectId !== 'all' && (
              <button
                onClick={() => onOpenProjectModal(activeProject)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white/60 dark:bg-slate-900/60 hover:bg-white rounded-xl border border-slate-200/60 dark:border-slate-800 transition-colors"
                title="编辑当前项目设置"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onOpenProjectModal()}
              className="p-2 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-colors font-medium text-xs flex items-center gap-1"
              title="创建新项目"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">新项目</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Cascade Switch (智能联动自动顺延) */}
          <button
            onClick={onToggleAutoCascade}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              autoCascade
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 shadow-sm'
                : 'bg-slate-200/50 text-slate-500 border-transparent hover:bg-slate-200'
            }`}
            title="开启后，前置任务顺延推迟时，所有关联后置任务自动同步平移计算！"
          >
            <Zap className={`w-3.5 h-3.5 ${autoCascade ? 'text-emerald-500 fill-emerald-500' : ''}`} />
            <span>自动联动推迟: {autoCascade ? '开启' : '关闭'}</span>
          </button>

          {/* Critical Path Toggle */}
          <button
            onClick={onToggleCriticalPath}
            className={`px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showCriticalPath
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40 shadow-sm'
                : 'bg-slate-200/50 text-slate-500 border-transparent hover:bg-slate-200'
            }`}
            title="高亮显示决定总工期的关键路径任务"
          >
            <Activity className="w-3.5 h-3.5 text-rose-500" />
            <span>关键路径</span>
          </button>

          {/* View Mode Segmented Controls (天/周/月) */}
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeViewMode(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-all ${
                  viewMode === mode
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {mode === 'day' ? '天' : mode === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>

          {/* Today Button */}
          <button
            onClick={onJumpToToday}
            className="px-3 py-1.5 text-xs font-medium bg-white/70 dark:bg-slate-900/70 hover:bg-white text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200/70 dark:border-slate-800 transition-colors flex items-center gap-1 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> 转到今天
          </button>

          {/* Primary Create Task Button */}
          <button
            onClick={onOpenTaskModal}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 active:scale-98 rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> ＋ 新增任务
          </button>

          {/* Export / Backup */}
          <button
            onClick={onOpenExportModal}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-900/70 hover:bg-white rounded-2xl border border-slate-200/70 dark:border-slate-800 transition-colors shadow-sm"
            title="备份 / 导出 / 恢复数据"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Dark / Light Glass Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white/70 dark:bg-slate-900/70 hover:bg-white rounded-2xl border border-slate-200/70 dark:border-slate-800 transition-colors shadow-sm"
            title="切换高透水晶亮色 / 曜石深色模式"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Sub Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="搜索任务、责任人或项目..."
            value={filterOptions.searchQuery}
            onChange={(e) => onFilterChange({ ...filterOptions, searchQuery: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterOptions.status}
            onChange={(e) => onFilterChange({ ...filterOptions, status: e.target.value })}
            className="px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">所有状态</option>
            <option value="todo">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
          </select>

          <select
            value={filterOptions.priority}
            onChange={(e) => onFilterChange({ ...filterOptions, priority: e.target.value })}
            className="px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:outline-none"
          >
            <option value="all">所有优先级</option>
            <option value="urgent">紧急</option>
            <option value="high">高优先级</option>
            <option value="medium">中等</option>
            <option value="low">普通</option>
          </select>
        </div>
      </div>
    </header>
  );
};
