export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight sm:text-[24px]">{title}</h1>
        {description && <p className="mt-1 text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-11 place-items-center rounded-xl bg-surface-2 text-muted">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-fg-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
