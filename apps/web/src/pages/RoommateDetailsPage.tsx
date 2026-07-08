import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  DoorOpen,
  GraduationCap,
  MapPin,
  Receipt,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { mockUniversities } from "@saknaha/constants/mockUniversities";
import { getPropertyById, getRoommateRequestById } from "../services/propertyService";
import type { Property, UniversityLocation } from "@saknaha/shared-types";

interface RoommateDetailsPageProps {
  requestId: string;
  onBack: () => void;
}

export default function RoommateDetailsPage({ requestId, onBack }: RoommateDetailsPageProps) {
  const request = getRoommateRequestById(requestId);
  const property = request ? getPropertyById(request.propertyId) : null;
  const universities = useMemo(
    () =>
      property ? mockUniversities.filter((item) => item.city === property.city) : mockUniversities,
    [property?.city],
  );
  const [selectedUniversityId, setSelectedUniversityId] = useState(universities[0]?.id ?? "");
  const [activeImage, setActiveImage] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  if (!request || !property) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
        <button className="secondary-button mb-5" onClick={onBack}>
          <ArrowRight size={18} aria-hidden="true" />
          رجوع
        </button>
        <div className="panel text-center">
          <h1 className="text-2xl font-black text-ink">الطلب غير موجود</h1>
          <p className="mt-2 text-sm font-bold text-stone-600">
            قد يكون الرابط غير صحيح أو تم حذف الطلب.
          </p>
        </div>
      </main>
    );
  }

  const selectedUniversity =
    universities.find((item) => item.id === selectedUniversityId) ?? universities[0];
  const distanceText = selectedUniversity
    ? formatDistance(property, selectedUniversity)
    : "غير محدد";
  const images = property.images.length > 0 ? property.images : [""];
  const pricePerPerson = Math.ceil(property.price / Math.max(1, property.maxResidents));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>

      <header className="mb-6">
        <p className="text-sm font-black text-berry">تفاصيل شريكة السكن</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
          شريكة سكن في {property.neighborhood}
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-stone-600 md:text-base">
          راجعي موقع السكن وصوره وبيانات الطلب قبل تأكيد الاهتمام.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-2">
        <DistanceMap
          property={property}
          universities={universities}
          selectedUniversity={selectedUniversity}
          onSelect={setSelectedUniversityId}
          distanceText={distanceText}
        />

        <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-soft">
          <p className="mb-3 text-sm font-black text-ink">صور السكن</p>
          <img
            src={images[activeImage]}
            alt={property.title}
            className="h-[340px] w-full rounded-2xl object-cover md:h-[430px]"
          />
          {images.length > 1 ? (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={`rounded-xl border p-1 ${activeImage === index ? "border-berry bg-fuchsia-50" : "border-stone-200 bg-white"}`}
                  onClick={() => setActiveImage(index)}
                >
                  <img
                    src={image}
                    alt={`صورة ${index + 1}`}
                    className="h-16 w-full rounded-lg object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="panel">
          <h2 className="text-2xl font-black text-ink">بيانات السكن</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info icon={MapPin} label="السكن" value={property.title} />
            <Info
              icon={MapPin}
              label="الحي"
              value={`${property.neighborhood} - ${property.city}`}
            />
            <Info
              icon={BedDouble}
              label="عدد الغرف الكلي"
              value={`${property.maxRooms.toLocaleString("ar-SA")} غرف`}
            />
            <Info
              icon={DoorOpen}
              label="الغرف المتاحة"
              value={`${request.availableRooms.toLocaleString("ar-SA")} غرفة`}
            />
            <Info
              icon={Receipt}
              label="السعر الكلي"
              value={`${property.price.toLocaleString("ar-SA")} ريال`}
            />
            <Info
              icon={UserRound}
              label="السعر المتوقع للفرد"
              value={`${pricePerPerson.toLocaleString("ar-SA")} ريال`}
              highlight
            />
          </div>
        </div>

        <div className="panel">
          <h2 className="text-2xl font-black text-ink">بيانات شريكة السكن</h2>
          <div className="mt-4 space-y-3">
            <Info
              icon={UserRound}
              label="نوع المستخدمة"
              value={request.userType === "student" ? "طالبة" : "موظفة"}
            />
            <Info icon={CalendarDays} label="موعد الانتقال" value={request.moveInDate} />
            <Info icon={GraduationCap} label="الجامعة أو جهة العمل" value={request.organization} />
            {request.major ? (
              <Info icon={GraduationCap} label="التخصص" value={request.major} />
            ) : null}
            <div className="rounded-2xl bg-linen p-4">
              <p className="text-xs font-bold text-stone-500">نبذة مختصرة</p>
              <p className="mt-2 text-sm font-bold leading-7 text-stone-700">{request.bio}</p>
            </div>
          </div>

          <button className="primary-button mt-5 w-full" onClick={() => setConfirmed(true)}>
            <Check size={18} aria-hidden="true" />
            تأكيد الاهتمام
          </button>
          {confirmed ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-mintdeep">
              تم تسجيل اهتمامك. التواصل المباشر قريبًا في النسخة القادمة.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function DistanceMap({
  property,
  universities,
  selectedUniversity,
  onSelect,
  distanceText,
}: {
  property: Property;
  universities: UniversityLocation[];
  selectedUniversity?: UniversityLocation;
  onSelect: (id: string) => void;
  distanceText: string;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex-1">
          <span className="label">اختاري الجامعة أو جهة المقارنة</span>
          <select
            className="field field-select"
            value={selectedUniversity?.id ?? ""}
            onChange={(event) => onSelect(event.target.value)}
          >
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
          يبعد السكن تقريبًا {distanceText}
        </div>
      </div>

      <div className="relative mt-4 min-h-[330px] overflow-hidden rounded-2xl border border-sky-100 bg-[#d9eceb]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:44px_44px]" />
        <MapDot
          className="right-[22%] top-[32%]"
          color="#7f3b75"
          label={selectedUniversity?.name ?? "الجامعة"}
        />
        <MapDot className="left-[24%] bottom-[28%]" color="#25856f" label={property.neighborhood} />
        <div className="absolute left-[28%] right-[27%] top-[48%] h-1 rotate-[-18deg] rounded-full bg-berry/60" />
        <div className="absolute right-4 top-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-100">
          <p className="text-xs font-black text-ink">خريطة تقريبية</p>
          <div className="mt-2 space-y-2 text-xs font-bold text-stone-600">
            <Legend color="#7f3b75" label="الجامعة" />
            <Legend color="#25856f" label="السكن" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MapDot({ className, color, label }: { className: string; color: string; label: string }) {
  return (
    <div className={`absolute z-10 flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft">
        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ink shadow-sm">
        {label}
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
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
    <div className="rounded-2xl bg-linen p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-stone-500">
        <Icon size={15} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-1 font-black ${highlight ? "text-xl text-berry" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function formatDistance(property: Property, university: UniversityLocation) {
  if (!property.lat || !property.lng) return property.distanceText;
  const distance = haversineKm(property.lat, property.lng, university.lat, university.lng);
  return `${distance.toLocaleString("ar-SA", { maximumFractionDigits: 1 })} كم`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
