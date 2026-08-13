import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../../types';
import { COLOR_PALETTE } from '../../utils/colorPalette';
import { X, FolderPlus, Tag, CheckCircle2, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  projectToEdit?: Project | null;
  allProjects: Project[];
}

export const ProjectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  projectToEdit,
  allProjects,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorId, setColorId] = useState('azure');
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
    if (projectToEdit) {
      setName(projectToEdit.name);
      setDescription(projectToEdit.description || '');
      setColorId(projectToEdit.colorId || 'azure');
      setLinkedProjectIds(projectToEdit.linkedProjectIds || []);
    } else {
      setName('');
      setDescription('');
      setColorId('azure');
      setLinkedProjectIds([]);
    }
  }, [projectToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const project: Project = {
      id: projectToEdit ? projectToEdit.id : `proj-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      colorId,
      startDate: projectToEdit ? projectToEdit.startDate : new Date().toISOString().split('T')[0],
      endDate: projectToEdit ? projectToEdit.endDate : new Date().toISOString().split('T')[0],
      linkedProjectIds,
    };

    onSave(project);
    onClose();
  };

  const otherProjects = allProjects.filter((p) => p.id !== projectToEdit?.id);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg liquid-glass rounded-3xl p-6 shadow-2xl border border-white/60 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {projectToEdit ? '编辑项目工程' : '新建项目工程'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  管理工程主体，设置个性色块与项目间联动
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

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                项目名称 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如: 品牌升级与官网重构..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                项目描述 / 目标
              </label>
              <textarea
                rows={2}
                placeholder="简述该项目的核心目标..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Fresh Color Badge Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-500" /> 主体标识色块
                </span>
                <span className="text-[11px] font-normal text-slate-400">清新淡雅风格</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorId(c.id)}
                    className={`p-2 rounded-xl flex items-center gap-2 transition-all border ${
                      colorId === c.id
                        ? 'ring-2 ring-blue-500 border-transparent scale-102 shadow-md'
                        : 'border-slate-200/60 dark:border-slate-800 hover:scale-101 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex + '20' }}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cross-Project Linkage (项目间联动) */}
            {otherProjects.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  项目间自动联动 (推迟时同步推迟关联项目)
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {otherProjects.map((p) => {
                    const isLinked = linkedProjectIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700 text-xs cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setLinkedProjectIds([...linkedProjectIds, p.id]);
                            } else {
                              setLinkedProjectIds(linkedProjectIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded text-blue-500 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
              {projectToEdit && onDelete && allProjects.length > 1 ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">确认删除项目及其所有任务？</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(projectToEdit.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
                    >
                      确认
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
                    className="px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 rounded-xl flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> 删除项目
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
                  <CheckCircle2 className="w-4 h-4" /> 保存项目
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
