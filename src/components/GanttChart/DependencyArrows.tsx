import React, { useState } from 'react';
import { TaskWithLevel } from '../../utils/dependencyEngine';
import { Dependency } from '../../types';
import { DayColumn, parseDate } from '../../utils/dateUtils';
import { differenceInCalendarDays } from 'date-fns';

interface Props {
  tasks: TaskWithLevel[];
  dependencies: Dependency[];
  columns: DayColumn[];
  viewMode: 'day' | 'week' | 'month';
  selectedTaskId: string | null;
  columnWidth?: number;
  criticalPathSet?: Set<string>;
  showCriticalPath?: boolean;
}

export const DependencyArrows: React.FC<Props> = ({
  tasks,
  dependencies,
  columns,
  viewMode,
  selectedTaskId,
  columnWidth: propColumnWidth,
  criticalPathSet,
  showCriticalPath,
}) => {
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    x: number;
    y: number;
    fromTitle: string;
    toTitle: string;
    type: string;
  } | null>(null);

  if (columns.length === 0 || tasks.length === 0 || dependencies.length === 0) return null;

  const columnWidth = propColumnWidth ?? (viewMode === 'day' ? 42 : viewMode === 'week' ? 28 : 18);
  const minDateStr = columns[0].dateStr;

  const getXForDate = (dateStr: string): number => {
    const daysDiff = differenceInCalendarDays(parseDate(dateStr), parseDate(minDateStr));
    return daysDiff * columnWidth;
  };

  // Map task ID to vertical index row position
  const taskRowMap = new Map<string, { rowIndex: number; task: TaskWithLevel }>();
  tasks.forEach((t, idx) => {
    taskRowMap.set(t.id, { rowIndex: idx, task: t });
  });

  const rowHeight = 44; // 11 in tailwind = 44px

  // Generate smooth rounded orthogonal SVG path
  const createSmoothPath = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    r = 8
  ): string => {
    // Same horizontal row level
    if (Math.abs(fromY - toY) < 2) {
      if (toX >= fromX + 8) {
        return `M ${fromX} ${fromY} L ${toX - 5} ${toY}`;
      } else {
        // Loop below row
        const dy = 22;
        return `M ${fromX} ${fromY} L ${fromX + 12 - r} ${fromY} Q ${fromX + 12} ${fromY} ${fromX + 12} ${fromY + r} L ${fromX + 12} ${fromY + dy - r} Q ${fromX + 12} ${fromY + dy} ${fromX + 12 - r} ${fromY + dy} L ${toX - 12 + r} ${fromY + dy} Q ${toX - 12} ${fromY + dy} ${toX - 12} ${fromY + dy - r} L ${toX - 12} ${toY + r} Q ${toX - 12} ${toY} ${toX - 12 + r} ${toY} L ${toX - 5} ${toY}`;
      }
    }

    const minGap = 16;
    if (toX >= fromX + minGap) {
      const midX = fromX + (toX - fromX) / 2;
      const dy = toY - fromY;
      const dirY = dy > 0 ? 1 : -1;
      const absDy = Math.abs(dy);
      const radius = Math.min(r, Math.abs(midX - fromX), absDy / 2);

      return [
        `M ${fromX} ${fromY}`,
        `L ${midX - radius} ${fromY}`,
        `Q ${midX} ${fromY} ${midX} ${fromY + dirY * radius}`,
        `L ${midX} ${toY - dirY * radius}`,
        `Q ${midX} ${toY} ${midX + radius} ${toY}`,
        `L ${toX - 5} ${toY}`,
      ].join(' ');
    }

    // Backward connection (successor starts before predecessor finishes)
    const dirY = toY > fromY ? 1 : -1;
    const loopXRight = fromX + 14;
    const loopXLeft = toX - 14;
    const midY = fromY + (toY - fromY) / 2;
    const radius = Math.min(r, 10, Math.abs(midY - fromY) / 2);

    return [
      `M ${fromX} ${fromY}`,
      `L ${loopXRight - radius} ${fromY}`,
      `Q ${loopXRight} ${fromY} ${loopXRight} ${fromY + dirY * radius}`,
      `L ${loopXRight} ${midY - dirY * radius}`,
      `Q ${loopXRight} ${midY} ${loopXRight - radius} ${midY}`,
      `L ${loopXLeft + radius} ${midY}`,
      `Q ${loopXLeft} ${midY} ${loopXLeft} ${midY + dirY * radius}`,
      `L ${loopXLeft} ${toY - dirY * radius}`,
      `Q ${loopXLeft} ${toY} ${loopXLeft + radius} ${toY}`,
      `L ${toX - 5} ${toY}`,
    ].join(' ');
  };

  return (
    <>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible">
        <defs>
          {/* Default Marker */}
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 Z" fill="#6366F1" opacity="0.9" />
          </marker>

          {/* Highlighted Marker */}
          <marker
            id="arrow-highlight"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="#EC4899" />
          </marker>

          {/* Critical Path Marker */}
          <marker
            id="arrow-critical"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="#F43F5E" />
          </marker>

          {/* Drop shadow glow for highlighted/critical path */}
          <filter id="line-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {dependencies.map((dep) => {
          const fromInfo = taskRowMap.get(dep.fromTaskId);
          const toInfo = taskRowMap.get(dep.toTaskId);

          if (!fromInfo || !toInfo) return null;

          const fromTask = fromInfo.task;
          const toTask = toInfo.task;

          // X Coordinates
          const fromX = fromTask.isMilestone
            ? getXForDate(fromTask.startDate) + columnWidth / 2 + 10
            : getXForDate(fromTask.endDate) + columnWidth;

          const toX = toTask.isMilestone
            ? getXForDate(toTask.startDate) + columnWidth / 2 - 10
            : getXForDate(toTask.startDate);

          // Y Coordinates
          const fromY = fromInfo.rowIndex * rowHeight + rowHeight / 2;
          const toY = toInfo.rowIndex * rowHeight + rowHeight / 2;

          const isSelected =
            selectedTaskId === dep.fromTaskId || selectedTaskId === dep.toTaskId;

          const isHovered = hoveredDepId === dep.id;

          const isCritical =
            showCriticalPath &&
            criticalPathSet?.has(dep.fromTaskId) &&
            criticalPathSet?.has(dep.toTaskId);

          const pathData = createSmoothPath(fromX, fromY, toX, toY);

          let strokeColor = '#6366F1'; // Default Indigo-500
          let markerId = 'url(#arrow-default)';
          let strokeWidth = '2';
          let opacity = '0.8';

          if (isCritical) {
            strokeColor = '#F43F5E'; // Rose-500
            markerId = 'url(#arrow-critical)';
            strokeWidth = '2.5';
            opacity = '1';
          }

          if (isSelected || isHovered) {
            strokeColor = '#EC4899'; // Pink-500
            markerId = 'url(#arrow-highlight)';
            strokeWidth = '3';
            opacity = '1';
          }

          return (
            <g key={dep.id} className="transition-all duration-200">
              {/* Invisible wider hit area for hover */}
              <path
                d={pathData}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                className="pointer-events-stroke cursor-pointer"
                onMouseEnter={(e) => {
                  setHoveredDepId(dep.id);
                  setTooltipInfo({
                    x: e.clientX,
                    y: e.clientY,
                    fromTitle: fromTask.title,
                    toTitle: toTask.title,
                    type: dep.type || 'FS',
                  });
                }}
                onMouseLeave={() => {
                  setHoveredDepId(null);
                  setTooltipInfo(null);
                }}
              />

              {/* Main Dependency Connector Line */}
              <path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                markerEnd={markerId}
                filter={isSelected || isHovered || isCritical ? 'url(#line-glow)' : undefined}
                className="transition-all duration-200"
              />

              {/* Origin Connector Dot */}
              <circle
                cx={fromX}
                cy={fromY}
                r={isSelected || isHovered ? '4' : '3'}
                fill={strokeColor}
                className="transition-all duration-200"
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip for Dependency Line */}
      {tooltipInfo && (
        <div
          style={{
            left: `${tooltipInfo.x + 12}px`,
            top: `${tooltipInfo.y + 12}px`,
          }}
          className="fixed z-50 px-3 py-2 rounded-xl bg-slate-900/90 text-white text-[11px] shadow-xl backdrop-blur-md border border-slate-700/80 pointer-events-none animate-fade-in flex flex-col gap-0.5"
        >
          <div className="font-bold text-indigo-300 flex items-center gap-1">
            🔗 逻辑依赖关系 ({tooltipInfo.type === 'FS' ? '完成-开始 FS' : tooltipInfo.type})
          </div>
          <div className="text-slate-300 truncate max-w-[220px]">
            前置: <span className="font-semibold text-white">{tooltipInfo.fromTitle}</span>
          </div>
          <div className="text-slate-300 truncate max-w-[220px]">
            后置: <span className="font-semibold text-white">{tooltipInfo.toTitle}</span>
          </div>
        </div>
      )}
    </>
  );
};
