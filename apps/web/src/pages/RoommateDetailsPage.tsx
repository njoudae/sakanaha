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
import { useEffect, useState } from "react";
import PropertyLocationMap from "../components/PropertyLocationMap";
import {
  addRoommateJoinRequest,
  getPropertyById,
  getRoommateRequestById,
  recordRoommateRequestView,
} from "../services/propertyService";
import type { UniversityLocation, User } from "@saknaha/shared-types";

interface RoommateDetailsPageProps {
  requestId: string;
  user: User | null;
  onBack: () => void;
  selectedUniversity: UniversityLocation | null;
  onUniversityChange: (university: UniversityLocation | null) => void;
}

export default function RoommateDetailsPage({
  requestId,
  user,
  onBack,
  selectedUniversity,
  onUniversityChange,
}: RoommateDetailsPageProps) {
  const request = getRoommateRequestById(requestId);
  const property = request ? getPropertyById(request.propertyId) : null;
  const [activeImage, setActiveImage] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    recordRoommateRequestView(requestId, user?.id ?? "guest-user");
  }, [requestId, user?.id]);

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
        <PropertyLocationMap
          property={property}
          selectedUniversity={selectedUniversity}
          onUniversityChange={onUniversityChange}
          className="mt-0"
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

          <button
            className="primary-button mt-5 w-full"
            onClick={() => {
              if (!user) return;
              addRoommateJoinRequest({
                requestId: request.id,
                requesterUserId: user.id,
                requesterName: user.name,
              });
              setConfirmed(true);
            }}
            disabled={!user || request.userId === user.id}
          >
            <Check size={18} aria-hidden="true" />
            {request.userId === user?.id ? "هذه بطاقتك" : "تأكيد طلب الانضمام"}
          </button>
          {confirmed ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-mintdeep">
              تم إرسال طلب الانضمام. سيظهر في لوحة تحكمك، ويظهر لصاحبة البطاقة لقبوله أو رفضه.
            </p>
          ) : null}
        </div>
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
    <div className="rounded-2xl bg-linen p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-stone-500">
        <Icon size={15} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-1 font-black ${highlight ? "text-xl text-berry" : "text-ink"}`}>{value}</p>
    </div>
  );
}
