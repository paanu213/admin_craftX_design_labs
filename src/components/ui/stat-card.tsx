import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  iconClassName?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconClassName,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-emerald-600" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              iconClassName ?? "bg-primary/10"
            )}
          >
            <Icon className={cn("h-6 w-6", iconClassName ? "text-white" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
