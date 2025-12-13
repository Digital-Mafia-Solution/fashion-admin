import React from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-muted-foreground gap-4 ${
        className ?? ""
      }`}
    >
      {icon && <div className="mx-auto">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
