import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100">
        <Icon className="h-10 w-10 text-neutral-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </Card>
  );
}
