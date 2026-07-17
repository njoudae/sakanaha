import {
  BarChart3,
  Bell,
  Building2,
  Heart,
  Home,
  Inbox,
  MessageCircle,
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
  children: ReactNode;
}

const navByKind = {
  user: [
    { label: "الرئيسية", icon: Home },
    { label: "السكن", icon: Search },
    { label: "شريكات السكن", icon: UsersRound },
    { label: "المفضلة", icon: Heart },
    { label: "طلباتي", icon: Inbox },
    { label: "الرسائل", icon: MessageCircle },
    { label: "الإشعارات", icon: Bell },
    { label: "الملف الشخصي", icon: UserRound },
    { label: "الإعدادات", icon: Settings },
  ],
  owner: [
    { label: "لوحة التحكم", icon: Home },
    { label: "عقاراتي", icon: Building2 },
    { label: "إضافة عقار", icon: Plus },
    { label: "الاهتمامات الواردة", icon: Inbox },
    { label: "طلبات شريكة السكن", icon: UsersRound },
    { label: "المفاوضات", icon: SlidersHorizontal },
    { label: "الرسائل", icon: MessageCircle },
    { label: "الإشعارات", icon: Bell },
    { label: "التحليلات", icon: BarChart3 },
    { label: "الملف الشخصي", icon: UserRound },
    { label: "الإعدادات", icon: Settings },
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

export default function DashboardShell({ kind, name, status, children }: DashboardShellProps) {
  const nav = navByKind[kind];

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 pb-24 md:px-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:pb-8">
      <aside className="hidden lg:block">
        <div className="sticky top-24 grid gap-4">
          <ProfilePanel name={name} status={status} nav={nav} />
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
  nav,
}: {
  name: string;
  status: string;
  nav: { label: string; icon: LucideIcon }[];
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
        </div>
      </div>
      <div className="grid gap-1">
        {nav.map((item) => (
          <button
            key={item.label}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-right text-sm font-black text-stone-600 transition hover:bg-linen hover:text-berry"
            type="button"
          >
            <item.icon size={17} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
