import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "positive" | "negative" | "accent";
}) {
  return (
    <Card className="gap-0 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          tone === "accent" && "text-primary",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

export function StockBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "IN STOCK" && "bg-success/12 text-success",
        status === "LOW STOCK" && "bg-warning/20 text-warning-foreground",
        status === "OUT OF STOCK" && "bg-destructive/12 text-destructive",
      )}
    >
      {status}
    </span>
  );
}
