import {
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  DoorOpen,
  GraduationCap,
  Loader2,
  MapPin,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useBusinessData } from "../data/BusinessDataContext";
import type { RoommateLifestylePreferences, User } from "@saknaha/shared-types";
import { getRoommatePricePerPerson } from "../services/listingPresentation";

interface RoommateDetailsPageProps {
  requestId: string;
  user: User | null;
  onBack: () => void;
  onLogin: () => void;
}

const preferenceLabels: Array<{
  key: keyof RoommateLifestylePreferences;
  label: string;
  values: Record<string, string>;
}> = [
  { key: "smoking", label: "التدخين", values: { yes: "تدخن", no: "لا تدخن" } },
  {
    key: "pets",
    label: "الحيوانات الأليفة",
    values: { allowed: "مسموحة", not_allowed: "غير مسموحة" },
  },
  {
    key: "sleep",
    label: "وقت النوم",
    values: { early: "مبكر", flexible: "مرن", late: "متأخر" },
  },
  {
    key: "occupation",
    label: "الصفة",
    values: { student: "طالبة", employee: "موظفة", both: "طالبة أو موظفة" },
  },
  {
    key: "cleanliness",
    label: "النظافة",
    values: { very_tidy: "منظمة جدًا", average: "متوسطة", no_preference: "لا تفضيل" },
  },
  {
    key: "noise",
    label: "الهدوء",
    values: { quiet: "هادئة", moderate: "متوسط", no_preference: "لا تفضيل" },
  },
];

export default function RoommateDetailsPage({
  requestId,
  user,
  onBack,
  onLogin,
}: RoommateDetailsPageProps) {
  const business = useBusinessData();
  const request = business.roommateRequests.find((item) => item.id === requestId);
  const property = request?.linkedPropertyId
    ? (business.properties.find((item) => item.id === request.linkedPropertyId) ?? null)
    : null;
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!request) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
        <button className="secondary-button mb-5" onClick={onBack} type="button">
          <ArrowRight size={18} aria-hidden="true" />
          رجوع
        </button>
        <div className="panel text-center">
          <h1 className="text-2xl font-black text-ink">البطاقة غير موجودة</h1>
          <p className="mt-2 text-sm font-bold text-stone-600">
            قد يكون الرابط غير صحيح أو تم حذف البطاقة.
          </p>
        </div>
      </main>
    );
  }

  const linkedToSaknaha = request.source === "saknaha_property" && property !== null;
  const pricePerPerson = getRoommatePricePerPerson(request, property);
  const city = property?.city ?? request.externalHousing?.city ?? request.city ?? "";
  const district =
    property?.neighborhood ?? request.externalHousing?.district ?? request.district ?? "";

  async function registerInterest() {
    if (!user || !request || request.userId === user.id || sending || confirmed) return;
    setSending(true);
    try {
      await business.registerRoommateInterest(request.id);
      setConfirmed(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-7 md:px-8 md:py-10" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        الرجوع لشريكات السكن
      </button>

      <header className="mb-5 text-right">
        <p className="text-sm font-black text-berry">بطاقة شريكة السكن</p>
        <h1 className="mt-1 text-2xl font-black text-ink md:text-3xl">
          {request.requesterName || "باحثة عن شريكة سكن"}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-stone-500">
          <MapPin size={15} aria-hidden="true" />
          {city}، حي {district}
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel">
          <h2 className="text-xl font-black text-ink">معلومات صاحبة البطاقة</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info
              icon={UserRound}
              label="الصفة"
              value={request.userType === "student" ? "طالبة" : "موظفة"}
            />
            <Info
              icon={GraduationCap}
              label="الجامعة أو جهة العمل"
              value={request.organization || "غير محدد"}
            />
            <Info icon={MapPin} label="المدينة" value={city} />
            <Info icon={MapPin} label="الحي" value={district} />
            <Info
              icon={DoorOpen}
              label="الغرف المتبقية"
              value={`${request.availableRooms.toLocaleString("ar-SA")} غرفة`}
            />
            <Info
              icon={BedDouble}
              label="السعر لكل واحدة"
              value={`${pricePerPerson.toLocaleString("ar-SA")} ر.س`}
              highlight
            />
          </div>
          <div className="mt-3 border border-stone-100 bg-linen p-4">
            <p className="text-xs font-bold text-stone-500">الوصف</p>
            <p className="mt-2 text-sm font-bold leading-7 text-stone-700">{request.bio}</p>
          </div>
        </div>

        <div className="panel">
          <h2 className="text-xl font-black text-ink">التفضيلات</h2>
          {request.preferences ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {preferenceLabels.map(({ key, label, values }) => (
                <div className="border border-stone-100 bg-linen p-3" key={key}>
                  <p className="text-xs font-bold text-stone-500">{label}</p>
                  <p className="mt-1 text-sm font-black text-ink">
                    {values[request.preferences?.[key] ?? ""] || "غير محدد"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 bg-linen p-4 text-sm font-bold text-stone-600">
              لم تضف صاحبة البطاقة تفضيلات بعد.
            </p>
          )}
        </div>
      </section>

      {linkedToSaknaha && property ? (
        <section className="panel mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-berry">السكن موجود في منصة سكنها</p>
              <h2 className="mt-1 text-xl font-black text-ink">معلومات السكن للاطلاع</h2>
            </div>
            <span className="bg-emerald-50 px-3 py-1.5 text-xs font-black text-mintdeep">
              مرتبط بالبطاقة
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
            {property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center bg-linen text-sm font-bold text-stone-500">
                لا توجد صورة
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Info icon={Building2} label="السكن" value={property.title} />
              <Info icon={Building2} label="النوع" value={property.propertyType} />
              <Info
                icon={BedDouble}
                label="الغرف"
                value={`${property.minRooms.toLocaleString("ar-SA")} - ${property.maxRooms.toLocaleString("ar-SA")}`}
              />
              <Info
                icon={Bath}
                label="دورات المياه"
                value={property.bathrooms.toLocaleString("ar-SA")}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-5 border border-stone-200 bg-white p-4 text-right shadow-sm md:p-5">
        {confirmed ? (
          <div className="bg-emerald-50 p-4 text-center" role="status">
            <Check className="mx-auto text-mintdeep" size={26} aria-hidden="true" />
            <p className="mt-2 font-black text-mintdeep">تم إرسال اهتمامك لصاحبة البطاقة</p>
            <p className="mt-1 text-sm font-bold leading-6 text-stone-600">
              ستقوم هي بالتواصل معك في أقرب فرصة.
            </p>
          </div>
        ) : !user ? (
          <button className="primary-button w-full" onClick={onLogin} type="button">
            <UserRound size={18} aria-hidden="true" />
            تسجيل الدخول كباحثة عن سكن
          </button>
        ) : request.userId === user.id ? (
          <button className="secondary-button w-full" disabled type="button">
            هذه بطاقتك
          </button>
        ) : (
          <button
            className="primary-button w-full"
            disabled={sending}
            onClick={() => void registerInterest()}
            type="button"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            ) : (
              <Check size={18} aria-hidden="true" />
            )}
            {sending ? "جاري إرسال اهتمامك..." : "تسجيل اهتمام"}
          </button>
        )}
        {!confirmed && request.userId !== user?.id ? (
          <p className="mt-2 text-center text-xs font-bold leading-5 text-stone-500">
            لاحقًا سيُرسل إشعار لصاحبة البطاقة عبر واتساب الشركة لتتواصل معك.
          </p>
        ) : null}
      </section>
    </main>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-stone-100 bg-linen p-3">
      <p className="flex items-center gap-2 text-xs font-bold text-stone-500">
        <Icon size={14} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-1 font-black ${highlight ? "text-lg text-berry" : "text-ink"}`}>{value}</p>
    </div>
  );
}
