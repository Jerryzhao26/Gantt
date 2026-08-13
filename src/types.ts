export type ViewMode = 'day' | 'week' | 'month';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish

export interface Dependency {
  id: string;
  fromTaskId: string; // Predecessor
  toTaskId: string;   // Successor
  type: DependencyType;
  lagDays: number;    // Offset in days (can be positive for delay, negative for overlap)
}

export interface Task {
  id: string;
  projectId: string;
  parentId: string | null; // null for top-level tasks
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  durationDays: number;
  progress: number;  // 0 to 100
  status: TaskStatus;
  priority: TaskPriority;
  colorId: string;    // Reference to ColorPalette
  assignee?: string;
  notes?: string;
  isMilestone?: boolean;
  expanded?: boolean; // For UI tree view toggle
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  colorId: string;
  startDate: string;
  endDate: string;
  linkedProjectIds?: string[]; // Projects linked to this project
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  bgLight: string;
  borderLight: string;
  textLight: string;
  bgDark: string;
  borderDark: string;
  textDark: string;
  glassBg: string;
  accent: string;
}

export interface CascadeChangeLog {
  taskId: string;
  taskTitle: string;
  oldStartDate: string;
  newStartDate: string;
  oldEndDate: string;
  newEndDate: string;
  shiftedDays: number;
  reason: string;
}

export interface FilterOptions {
  searchQuery: string;
  status: string;
  priority: string;
  assignee: string;
}
