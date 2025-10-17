import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Suborder } from "@/lib/types";
import { Calendar, Check, Clock } from "lucide-react";

interface SuborderTimelineProps {
  suborders: Suborder[];
}

export function SuborderTimeline({ suborders }: SuborderTimelineProps) {
  if (!suborders || suborders.length === 0) return null;

  const statusConfig = {
    scheduled: { label: "待取貨", color: "bg-blue-500", icon: Clock },
    completed: { label: "已完成", color: "bg-green-500", icon: Check },
    cancelled: { label: "已取消", color: "bg-red-500", icon: Check },
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <h4 className="font-semibold text-neutral-900">分段取貨安排</h4>
        <Badge variant="secondary" className="text-xs">
          {suborders.length} 次取貨
        </Badge>
      </div>

      <div className="space-y-3">
        {suborders.map((suborder, index) => {
          const config = statusConfig[suborder.status];
          const Icon = config.icon;
          const isLast = index === suborders.length - 1;

          return (
            <div key={suborder.id} className="relative flex gap-3">
              {/* 時間軸線 */}
              {!isLast && (
                <div className="absolute left-[11px] top-8 h-full w-0.5 bg-neutral-200" />
              )}

              {/* 狀態點 */}
              <div
                className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
              >
                <Icon className="h-3 w-3 text-white" />
              </div>

              {/* 內容 */}
              <div className="flex-1 space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-900">
                    第 {index + 1} 次取貨
                  </p>
                  <Badge
                    variant={
                      suborder.status === "completed"
                        ? "default"
                        : suborder.status === "cancelled"
                        ? "destructive"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">
                  {new Date(suborder.scheduleAt).toLocaleString("zh-TW", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {suborder.quantity && (
                  <p className="text-xs text-neutral-500">
                    數量：{suborder.quantity} 件
                  </p>
                )}
                {suborder.notes && (
                  <p className="text-xs text-neutral-500">
                    備註：{suborder.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
