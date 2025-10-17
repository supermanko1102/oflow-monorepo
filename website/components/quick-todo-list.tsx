"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { TodoItem } from "@/lib/types";

interface QuickTodoListProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onItemClick?: (todo: TodoItem) => void;
}

export function QuickTodoList({
  todos,
  onToggle,
  onItemClick,
}: QuickTodoListProps) {
  const incompleteTodos = todos.filter((t) => !t.completed).slice(0, 3);
  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  if (incompleteTodos.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-neutral-200 p-6 text-center">
        <p className="text-sm text-neutral-500">✨ 太棒了！所有待辦都完成了</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 進度條 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">今日必做事項</span>
          <span className="text-neutral-500">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* 待辦項目 */}
      <div className="space-y-2">
        {incompleteTodos.map((todo) => (
          <button
            key={todo.id}
            onClick={() => onItemClick?.(todo)}
            className="flex w-full items-start gap-3 rounded-lg bg-neutral-50 p-3 text-left transition-colors hover:bg-neutral-100 active:bg-neutral-200"
          >
            <Checkbox
              checked={todo.completed}
              onCheckedChange={(e) => {
                e.stopPropagation();
                onToggle(todo.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-neutral-900">
                {todo.title}
              </p>
              {todo.time && (
                <p className="text-xs text-neutral-500">⏰ {todo.time}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
