import { BarChart3, Building2, FilePenLine, LogOut, Plus, Settings } from "lucide-react";
import PropertyCard from "../components/PropertyCard";
import { getOwnerInterests, getOwnerProperties } from "../services/propertyService";
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
  const interests = getOwnerInterests(owner.id);

  return (
    <main className="page-shell" dir="rtl">
      <header className="mb-6 rounded-2xl border border-white/70 bg-white/85 p-4 text-right shadow-soft md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-mintdeep">لوحة صاحب السكن</p>
            <h1 className="mt-1 text-3xl font-black text-ink">مرحباً {owner.fullName}</h1>
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
        <ActionCard
          icon={FilePenLine}
          title="عقاراتي"
          count={properties.length}
          onClick={onManage}
        />
        <ActionCard
          icon={Settings}
          title="الاهتمامات الواردة"
          count={interests.length}
          onClick={onManage}
        />
        <ActionCard icon={BarChart3} title="إحصائيات مختصرة" onClick={onManage} />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-ink">عقاراتي</h2>
          <button className="primary-button" onClick={onAddProperty}>
            <Plus size={18} aria-hidden="true" />
            إضافة سكن
          </button>
        </div>
        {properties.length === 0 ? (
          <div className="panel text-center">
            <Building2 className="mx-auto text-stone-400" size={44} aria-hidden="true" />
            <h3 className="mt-3 text-xl font-black text-ink">لا توجد وحدات بعد</h3>
            <p className="mt-2 text-stone-600">ابدأ بإضافة أول سكن، خطوة خطوة.</p>
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
  count,
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      className="panel flex items-center justify-between gap-3 text-right transition hover:border-skysoft"
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-mintdeep">
          <Icon size={22} aria-hidden="true" />
        </span>
        <span className="font-black text-ink">{title}</span>
      </span>
      {typeof count === "number" ? (
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-berry px-2 text-sm font-black text-white">
          {count.toLocaleString("ar-SA")}
        </span>
      ) : null}
    </button>
  );
}
