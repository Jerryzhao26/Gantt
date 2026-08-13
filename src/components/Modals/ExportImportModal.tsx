import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Task, Dependency } from '../../types';
import { X, Download, Upload, Copy, Check, FileCode2, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  tasks: Task[];
  dependencies: Dependency[];
  onImport: (data: { projects: Project[]; tasks: Task[]; dependencies: Dependency[] }) => void;
}

export const ExportImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projects,
  tasks,
  dependencies,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'json_export' | 'csv_export' | 'import'>('json_export');
  const [importJsonText, setImportJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const exportData = {
    version: '1.0',
    exportTime: new Date().toISOString(),
    projects,
    tasks,
    dependencies,
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  // Generate CSV representation
  const generateCSV = (): string => {
    const headers = [
      '任务ID',
      '所属项目',
      '父任务ID',
      '任务名称',
      '开始日期',
      '结束日期',
      '工期(天)',
      '进度(%)',
      '状态',
      '优先级',
      '责任人',
      '里程碑',
      '备注',
    ];

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    const rows = tasks.map((t) => [
      t.id,
      `"${projectMap.get(t.projectId) || t.projectId}"`,
      t.parentId ? `"${t.parentId}"` : '""',
      `"${t.title.replace(/"/g, '""')}"`,
      t.startDate,
      t.endDate,
      t.durationDays,
      t.progress,
      t.status === 'completed'
        ? '已完成'
        : t.status === 'in_progress'
        ? '进行中'
        : t.status === 'blocked'
        ? '已阻塞'
        : '未开始',
      t.priority === 'urgent'
        ? '紧急'
        : t.priority === 'high'
        ? '高'
        : t.priority === 'medium'
        ? '中'
        : '低',
      `"${(t.assignee || '').replace(/"/g, '""')}"`,
      t.isMilestone ? '是' : '否',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  const csvString = generateCSV();

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCsv = () => {
    navigator.clipboard.writeText(csvString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gantt_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    // UTF-8 BOM for Excel compatibility with Chinese characters
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Gantt_Tasks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setErrorMsg('');
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.projects || !parsed.tasks) {
        throw new Error('导入数据缺少必需的 projects 或 tasks 格式');
      }
      onImport({
        projects: parsed.projects,
        tasks: parsed.tasks,
        dependencies: parsed.dependencies || [],
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'JSON 解析错误，请确认文件格式正确');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl liquid-glass rounded-3xl p-6 shadow-2xl border border-white/60 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  工程数据备份与导出
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  导出 JSON 全量配置文件或 Excel (CSV) 报表，防止数据丢失
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

          {/* Navigation Segmented Tabs */}
          <div className="flex gap-2 p-1.5 mt-4 rounded-xl bg-slate-200/60 dark:bg-slate-800/60">
            <button
              onClick={() => setActiveTab('json_export')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'json_export'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" /> JSON 全量备份
            </button>

            <button
              onClick={() => setActiveTab('csv_export')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'csv_export'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel (CSV) 导出
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> 恢复/导入
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'json_export' ? (
              <div className="space-y-3">
                <textarea
                  readOnly
                  rows={8}
                  value={jsonString}
                  className="w-full p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-700 focus:outline-none"
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    包含 {projects.length} 个工程，{tasks.length} 项任务，{dependencies.length} 条依赖关系
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyJson}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '已复制 JSON' : '复制 JSON'}
                    </button>
                    <button
                      onClick={handleDownloadJson}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md transition-all flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> 下载备份 (.json)
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'csv_export' ? (
              <div className="space-y-3">
                <textarea
                  readOnly
                  rows={8}
                  value={csvString}
                  className="w-full p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] border border-slate-700 focus:outline-none"
                />
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    适合直接使用 Excel、WPS 或 Apple Numbers 打开查看与打印
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyCsv}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '已复制 CSV' : '复制 CSV'}
                    </button>
                    <button
                      onClick={handleDownloadCsv}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> 下载 Excel 表格 (.csv)
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  将先前下载备份的 JSON 文本内容粘贴在下方，导入将覆盖替换当前界面的甘特图工程：
                </p>
                <textarea
                  rows={8}
                  placeholder="在此处粘贴 JSON 数据..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                {errorMsg && (
                  <div className="text-xs text-rose-500 font-medium px-1">{errorMsg}</div>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importJsonText.trim()}
                    className="px-4 py-2 text-xs font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> 确认导入并恢复数据
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

