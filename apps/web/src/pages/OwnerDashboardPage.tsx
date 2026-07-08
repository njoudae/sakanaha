import { BarChart3, Building2, FilePenLine, LogOut, Plus, Settings } from "lucide-react";
import Badge from "../components/Badge";
import PropertyCard from "../components/PropertyCard";
import { getOwnerProperties } from "../services/propertyService";
import type { Owner, Property } from "@saknaha/shared-types";

interface OwnerDashboardPageProps {
  owner: Owner;
  onAddProperty: () => void;
  onManage: () => void;
  onEdit: (property: Property) => void;
  onView: (propertyId: string) => void;
  onLogout: () => void;
}

export default function OwnerDashboardPage({
  owner,
  onAddProperty,
  onManage,
  onView,
  onLogout,
}: OwnerDashboardPageProps) {
  const properties = getOwnerProperties(owner.id);

  return (
    <main className="page-shell">
      <header className="mb-6 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-soft md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-mintdeep">لوحة صاحب السكن</p>
            <h1 className="mt-1 text-3xl font-black text-ink">مرحبًا {owner.fullName}</h1>
            <p className="mt-2 text-sm font-bold text-stone-600">رقم الجوال: {owner.phone}</p>
          </div>
          <div className="flex">
            <button className="danger-button" onClick={onLogout}>
              <LogOut size={18} aria-hidden="true" />
              تسجيل خروج
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <ActionCard icon={Plus} title="إضافة سكن" onClick={onAddProperty} />
        <ActionCard icon={FilePenLine} title="تعديل وحدة" onClick={onManage} />
        <ActionCard icon={Settings} title="إدارة الوحدات" onClick={onManage} />
        <ActionCard icon={BarChart3} title="إحصائيات مختصرة" onClick={onManage} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {["عدد مسجلات الاهتمام", "التقييمات", "التعليقات", "طلبات التواصل"].map((title) => (
          <div className="panel" key={title}>
            <p className="font-black text-ink">{title}</p>
            <div className="mt-3">
              <Badge tone="stone">قريبًا</Badge>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-ink">وحداتك السكنية</h2>
          <button className="primary-button" onClick={onAddProperty}>
            <Plus size={18} aria-hidden="true" />
            إضافة سكن
          </button>
        </div>
        {properties.length === 0 ? (
          <div className="panel text-center">
            <Building2 className="mx-auto text-stone-400" size={44} aria-hidden="true" />
            <h3 className="mt-3 text-xl font-black text-ink">لا توجد وحدات بعد</h3>
            <p className="mt-2 text-stone-600">ابدأ بإضافة أول وحدة، خطوة خطوة.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={() => onView(property.id)}
                compact
                actionLabel="عرض كما تشاهده الباحثات"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function ActionCard({
  icon: Icon,
  title,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className="panel flex items-center gap-3 text-right transition hover:border-skysoft"
      onClick={onClick}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-mintdeep">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="font-black text-ink">{title}</span>
    </button>
  );
}
