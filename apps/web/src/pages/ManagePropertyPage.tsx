import { ArrowRight, MapPinned, PauseCircle, Pencil, Settings } from "lucide-react";
import Badge from "../components/Badge";
import { getOwnerProperties, updatePropertyStatus } from "../services/propertyService";
import type { Owner, Property } from "@saknaha/shared-types";
import { formatRooms, getGoogleMapsUrl } from "@saknaha/utils/propertyFormat";

interface ManagePropertyPageProps {
  owner: Owner;
  onBack: () => void;
  onEdit: (property: Property) => void;
  onRefresh: () => void;
}

export default function ManagePropertyPage({
  owner,
  onBack,
  onEdit,
  onRefresh,
}: ManagePropertyPageProps) {
  const properties = getOwnerProperties(owner.id);

  function pause(property: Property) {
    updatePropertyStatus(property.id, property.status === "paused" ? "published" : "paused");
    onRefresh();
  }

  return (
    <main className="page-shell">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع إلى لوحة التحكم
      </button>
      <header className="mb-6">
        <p className="text-sm font-black text-mintdeep">إدارة وحدات السكن</p>
        <h1 className="text-3xl font-black text-ink">راجع النشر والتفاصيل</h1>
      </header>
      <div className="grid gap-4">
        {properties.length === 0 ? (
          <div className="panel text-center text-stone-600">
            لا توجد وحدات مضافة لهذا الحساب بعد.
          </div>
        ) : (
          properties.map((property) => {
            const googleMapsUrl = getGoogleMapsUrl(property);
            return (
              <article className="panel grid gap-4 lg:grid-cols-[180px_1fr_auto]" key={property.id}>
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="h-44 w-full rounded-2xl object-cover lg:h-full"
                />
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone={property.status === "published" ? "mint" : "stone"}>
                      {property.status === "published"
                        ? "منشور"
                        : property.status === "draft"
                          ? "مسودة"
                          : "متوقف"}
                    </Badge>
                    <Badge>{property.classification}</Badge>
                    {property.allowWhatsappContact ? <Badge tone="sky">تواصل واتساب</Badge> : null}
                  </div>
                  <h2 className="text-2xl font-black text-ink">{property.title}</h2>
                  <p className="mt-2 text-sm font-bold text-stone-600">
                    رقم الرخصة: {property.propertyLicenseNumber}
                  </p>
                  <p className="mt-2 text-sm font-bold text-stone-600">
                    {property.city}، {property.neighborhood} -{" "}
                    {property.price.toLocaleString("ar-SA")} ريال - {formatRooms(property)} -{" "}
                    {property.paymentType}
                  </p>
                  <p className="mt-2 text-sm font-bold text-stone-600">
                    الأدوار: {property.floorsCount.toLocaleString("ar-SA")} - المصعد:{" "}
                    {property.hasElevator ? "يوجد" : "لا يوجد"} - عامل النظافة:{" "}
                    {property.hasCleaningWorker ? "يوجد" : "لا يوجد"}
                  </p>
                  <p className="mt-2 text-sm font-bold text-stone-600">
                    باص الجامعة: {property.universityBusPasses ? "يمر عليه" : "لا يمر عليه"}
                  </p>
                  {googleMapsUrl ? (
                    <a
                      className="secondary-button mt-3"
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPinned size={18} aria-hidden="true" />
                      فتح الموقع في Google Maps
                    </a>
                  ) : null}
                  <div className="mt-4 grid gap-2 text-sm font-bold text-stone-600 sm:grid-cols-3">
                    <span className="rounded-xl bg-linen p-3">المسجلات اهتمامهن: قريبًا</span>
                    <span className="rounded-xl bg-linen p-3">التقييمات: قريبًا</span>
                    <span className="rounded-xl bg-linen p-3">التعليقات: قريبًا</span>
                    <span className="rounded-xl bg-linen p-3">طلبات التواصل: قريبًا</span>
                    <span className="rounded-xl bg-linen p-3">نسبة الإشغال: قريبًا</span>
                    <span className="rounded-xl bg-linen p-3">
                      يوجد عميلات محتملات لم يناسبهن السعر - قريبًا
                    </span>
                  </div>
                </div>
                <div className="grid content-start gap-2 sm:grid-cols-3 lg:w-36 lg:grid-cols-1">
                  <button className="secondary-button" onClick={() => onEdit(property)}>
                    <Pencil size={18} aria-hidden="true" />
                    تعديل
                  </button>
                  <button className="secondary-button" onClick={() => onEdit(property)}>
                    <Settings size={18} aria-hidden="true" />
                    إدارة
                  </button>
                  <button className="danger-button" onClick={() => pause(property)}>
                    <PauseCircle size={18} aria-hidden="true" />
                    {property.status === "paused" ? "إعادة النشر" : "إيقاف النشر"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
