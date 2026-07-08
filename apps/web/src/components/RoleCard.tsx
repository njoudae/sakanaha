import type { LucideIcon } from "lucide-react";
import Badge from "./Badge";

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
  onClick?: () => void;
}

export default function RoleCard({
  title,
  description,
  icon: Icon,
  disabled,
  badge,
  onClick,
}: RoleCardProps) {
  return (
    <button
      className="panel group flex min-h-44 w-full min-w-0 flex-col overflow-hidden text-right transition hover:-translate-y-1 hover:border-skysoft disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 lg:min-h-56"
      disabled={disabled}
      onClick={onClick}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linen text-berry">
          <Icon size={28} aria-hidden="true" />
        </span>
        {badge ? <Badge tone="stone">{badge}</Badge> : null}
      </div>
      <h2 className="text-2xl font-black text-ink">{title}</h2>
      <p className="mt-3 text-base leading-8 text-stone-600 lg:max-w-sm">{description}</p>
    </button>
  );
}
