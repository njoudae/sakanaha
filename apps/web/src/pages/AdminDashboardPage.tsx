import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  Flag,
  Gauge,
  HardDrive,
  Map,
  MessageSquare,
  Settings,
  ShieldCheck,
  Smartphone,
  UserRound,
  UsersRound,
} from "lucide-react";
import DashboardShell from "../components/DashboardShell";

const adminSections = [
  { title: "نظرة عامة", icon: Gauge },
  { title: "المستخدمون", icon: UserRound },
  { title: "الملاك", icon: Building2 },
  { title: "توثيق العقارات", icon: ClipboardCheck },
  { title: "العقارات", icon: Boxes },
  { title: "فرص شريكات السكن", icon: UsersRound },
  { title: "مزودو الخدمات", icon: ShieldCheck },
  { title: "البلاغات", icon: MessageSquare },
  { title: "الإشعارات", icon: Bell },
  { title: "استخدام الرسائل", icon: Smartphone },
  { title: "استخدام الخرائط", icon: Map },
  { title: "استخدام التخزين", icon: HardDrive },
  { title: "استخدام الواجهات", icon: BarChart3 },
  { title: "التكاليف المتوقعة", icon: BarChart3 },
  { title: "سجلات التدقيق", icon: ShieldCheck },
  { title: "أعلام الميزات", icon: Flag },
  { title: "إعدادات النظام", icon: Settings },
];

export default function AdminDashboardPage() {
  return (
    <DashboardShell kind="admin" name="إدارة سكنها" status="مساحة إدارية محمية">
      <header className="mb-5 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-wide text-berry">لوحة الإدارة</p>
        <h1 className="mt-2 text-3xl font-black text-ink">إدارة المنصة العامة</h1>
        <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-stone-600">
          هذا المسار منفصل عن التنقل العادي ويجب أن يبقى محمياً لصلاحية المدير فقط مع توسع التفويض
          من الخلفية.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {adminSections.map((section) => (
          <button
            key={section.title}
            className="panel flex items-center gap-3 text-right transition hover:border-berry"
            type="button"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linen text-berry">
              <section.icon size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-black text-ink">{section.title}</span>
              <span className="mt-1 block text-xs font-bold text-stone-500">
                جاهز للربط ببيانات الإنتاج
              </span>
            </span>
          </button>
        ))}
      </section>
    </DashboardShell>
  );
}
