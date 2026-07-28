import {
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  Heart,
  Home,
  Inbox,
  LogOut,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import NotificationCenter from "./NotificationCenter";

type ShellKind = "user" | "owner" | "admin";

interface DashboardShellProps {
  kind: ShellKind;
  name: string;
  status: string;
  publicCode?: string;
  navigation?: DashboardNavItem[];
  onNavigate?: (label: string) => void;
  children: ReactNode;
}

export interface DashboardNavItem {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

const navByKind = {
  user: [
    { label: "لوحة التحكم", icon: Home },
    { label: "البحث عن سكن", icon: Search },
    { label: "البحث عن شريكة سكن", icon: UsersRound },
    { label: "إنشاء بطاقة شريكة سكن", icon: Plus },
    { label: "بطاقاتي", icon: UserRound },
    { label: "اهتمامات شريكات السكن", icon: Inbox },
    { label: "الاهتمامات", icon: Heart },
    { label: "التفضيلات", icon: SlidersHorizontal },
    { label: "الإعدادات", icon: Settings },
    { label: "تسجيل الخروج", icon: LogOut },
  ],
  owner: [
    { label: "لوحة التحكم", icon: Home },
    { label: "عقاراتي", icon: Building2 },
    { label: "إضافة عقار", icon: Plus },
    { label: "طلبات العقارات", icon: Inbox },
    { label: "المدفوعات", icon: CreditCard },
    { label: "الإعدادات", icon: Settings },
    { label: "تسجيل الخروج", icon: LogOut },
  ],
  admin: [
    { label: "نظرة عامة", icon: Home },
    { label: "المستخدمون", icon: UserRound },
    { label: "الملاك", icon: Building2 },
    { label: "العقارات", icon: Search },
    { label: "شريكات السكن", icon: UsersRound },
    { label: "البلاغات", icon: Inbox },
    { label: "الإشعارات", icon: Bell },
    { label: "التكاليف", icon: BarChart3 },
    { label: "سجلات التدقيق", icon: SlidersHorizontal },
    { label: "أعلام الميزات", icon: Settings },
  ],
} satisfies Record<ShellKind, { label: string; icon: LucideIcon }[]>;

export default function DashboardShell({
  kind,
  name,
  status,
  publicCode,
  navigation,
  onNavigate,
  children,
}: DashboardShellProps) {
  const nav: DashboardNavItem[] = navigation ?? navByKind[kind];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 pb-24 md:px-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:pb-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24 grid gap-4">
          <ProfilePanel
            name={name}
            status={status}
            publicCode={publicCode}
            nav={nav}
            onNavigate={onNavigate}
          />
          <NotificationCenter />
        </div>
      </aside>

      <section className="min-w-0">{children}</section>

      <nav className="fixed inset-x-0 bottom-0 z-[2100] border-t border-stone-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {nav.slice(0, 5).map((item) => (
            <button
              key={item.label}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black text-stone-600 transition hover:bg-linen hover:text-berry"
              type="button"
              onClick={item.onClick ?? (() => onNavigate?.(item.label))}
            >
              <item.icon size={18} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ProfilePanel({
  name,
  status,
  publicCode,
  onNavigate,
  nav,
}: {
  name: string;
  status: string;
  publicCode?: string;
  nav: DashboardNavItem[];
  onNavigate?: (label: string) => void;
}) {
  return (
    <section className="panel">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-berry text-lg font-black text-white">
          {name.trim().slice(0, 1).toUpperCase() || "S"}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black text-ink">{name}</h2>
          <p className="text-sm font-bold text-stone-600">{status}</p>
          {publicCode ? (
            <p className="mt-1 text-xs font-black tracking-wide text-berry" dir="ltr">
              {publicCode}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1">
        {nav.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-black text-stone-600 transition hover:bg-linen hover:text-berry"
            type="button"
            onClick={item.onClick ?? (() => onNavigate?.(item.label))}
          >
            <item.icon size={17} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
