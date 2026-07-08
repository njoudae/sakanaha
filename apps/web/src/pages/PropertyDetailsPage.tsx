import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  MapPinned,
  MessageCircle,
  Pencil,
  Share2,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import Badge from "../components/Badge";
import RoommateRequestForm from "../components/RoommateRequestForm";
import {
  addInterest,
  addRoommatePreference,
  getOwnerSubmittedPublishedProperties,
  getProperties,
  getPropertyById,
  isFavoriteProperty,
  toggleFavoriteProperty,
} from "../services/propertyService";
import type { Property, User } from "@saknaha/shared-types";
import { absoluteAppUrl, cityPath, propertyPath } from "../utils/routes";
import {
  formatRooms,
  formatServiceDistance,
  getGoogleMapsUrl,
} from "@saknaha/utils/propertyFormat";

interface PropertyDetailsPageProps {
  propertyId: string;
  user: User | null;
  onBackToCity: (city: string) => void;
  onProperty: (propertyId: string) => void;
  mode?: "public" | "owner-preview";
  onEdit?: (property: Property) => void;
  onPreviewBack?: () => void;
  onOwnerProperties?: () => void;
}

function maskPhone(phone: string) {
  return phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-2)}` : "مخفي";
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("966")
    ? digits
    : digits.startsWith("0")
      ? `966${digits.slice(1)}`
      : digits;
  return normalized ? `https://wa.me/${normalized}` : "";
}

export default function PropertyDetailsPage({
  propertyId,
  user,
  onBackToCity,
  onProperty,
  mode = "public",
  onEdit,
  onPreviewBack,
  onOwnerProperties,
}: PropertyDetailsPageProps) {
  const property = getPropertyById(propertyId);
  const isOwnerPreview = mode === "owner-preview";
  const userId = user?.id ?? "guest-user";
  const [message, setMessage] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [showRoommateForm, setShowRoommateForm] = useState(false);
  const [favorite, setFavorite] = useState(() =>
    property ? isFavoriteProperty(property.id, userId) : false,
  );

  const sameCityProperties = useMemo(() => {
    if (!property) return [];
    const ownerProperties = getOwnerSubmittedPublishedProperties();
    const source =
      ownerProperties.length > 0
        ? ownerProperties
        : getProperties().filter((item) => item.ownerId !== "mock-owner");
    const sameCity = source.filter((item) => item.city === property.city);
    return sameCity.some((item) => item.id === property.id) ? sameCity : [property, ...sameCity];
  }, [property?.id]);

  if (!property) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
        <div className="panel text-center">
          <h1 className="text-2xl font-black text-ink">السكن غير موجود</h1>
          <p className="mt-2 text-sm font-bold text-stone-600">
            قد يكون الرابط غير صحيح أو تم حذف السكن.
          </p>
        </div>
      </main>
    );
  }

  const currentProperty = property;
  const images = currentProperty.images.length > 0 ? currentProperty.images : [""];
  const activeImage = images[imageIndex] ?? images[0];
  const googleMapsUrl = getGoogleMapsUrl(currentProperty);
  const canUseWhatsapp =
    currentProperty.allowWhatsappContact && whatsappUrl(currentProperty.ownerPhone);
  const pageUrl = absoluteAppUrl(propertyPath(currentProperty.id));

  function recordInterest(mode: "whole-unit" | "roommate" | "visit" | "general") {
    addInterest({ propertyId: currentProperty.id, userId, mode });
    if (mode === "roommate") {
      addRoommatePreference({
        propertyId: currentProperty.id,
        userId,
        roomsWanted: 1,
        acceptsSharedContract: true,
      });
      setMessage(
        "تم تسجيل اهتمامك بالروم ميت. سيتم حفظ الطلب ضمن بيانات السكن والمدينة للمتابعة لاحقًا.",
      );
      return;
    }
    if (mode === "whole-unit") {
      setMessage("تم تسجيل طلب حجز السكن كاملًا. الحجز والدفع الإلكتروني قريبًا.");
      return;
    }
    if (mode === "visit") {
      setMessage("تم حفظ رغبتك بتحديد موعد زيارة. اختيار التاريخ التفصيلي قريبًا.");
      return;
    }
    setMessage("تم تسجيل اهتمامك بالسكن بنجاح.");
  }

  async function shareProperty() {
    const shareData = {
      title: currentProperty.title,
      text: `شاهدي هذا السكن في ${currentProperty.city}: ${currentProperty.title}`,
      url: pageUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setMessage("تم فتح خيارات المشاركة.");
        return;
      }
      await navigator.clipboard.writeText(pageUrl);
      setMessage("تم نسخ رابط السكن.");
    } catch {
      setMessage("لم تتم المشاركة. يمكنك نسخ الرابط من شريط المتصفح.");
    }
  }

  function toggleFavorite() {
    setFavorite(toggleFavoriteProperty(currentProperty, userId));
    setMessage("تم تحديث المفضلة. هذا يساعد مستقبلًا في فهم الاهتمام حسب المدينة.");
  }

  function nextImage() {
    setImageIndex((current) => (current + 1) % images.length);
  }

  function previousImage() {
    setImageIndex((current) => (current - 1 + images.length) % images.length);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {isOwnerPreview ? (
          <>
            <button className="secondary-button" onClick={onPreviewBack ?? onOwnerProperties}>
              <ArrowRight size={18} aria-hidden="true" />
              رجوع
            </button>
            <button className="primary-button" onClick={() => onEdit?.(currentProperty)}>
              <Pencil size={18} aria-hidden="true" />
              تعديل السكن
            </button>
            <button className="secondary-button" onClick={onOwnerProperties}>
              <Building2 size={18} aria-hidden="true" />
              وحداتي
            </button>
          </>
        ) : (
          <>
            <button className="secondary-button" onClick={() => onBackToCity(property.city)}>
              <ArrowRight size={18} aria-hidden="true" />
              العودة لسكن {property.city}
            </button>
            <a className="secondary-button" href={cityPath(property.city)}>
              تصفح المدينة
            </a>
          </>
        )}
      </div>

      <section className="rounded-3xl border border-white/70 bg-white/90 shadow-soft">
        <header className="border-b border-stone-100 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-berry">
                {isOwnerPreview ? "معاينة كما تظهر للباحثات" : "تفاصيل السكن"}
              </p>
              <h1 className="mt-1 text-3xl font-black text-ink md:text-4xl">{property.title}</h1>
              <p className="mt-3 text-sm font-bold text-stone-600">
                {property.city}، {property.neighborhood}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="secondary-button"
                onClick={isOwnerPreview ? undefined : shareProperty}
                disabled={isOwnerPreview}
              >
                <Share2 size={18} aria-hidden="true" />
                مشاركة
              </button>
              <button
                className={favorite ? "primary-button" : "secondary-button"}
                onClick={isOwnerPreview ? undefined : toggleFavorite}
                disabled={isOwnerPreview}
              >
                <Heart size={18} fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
                {favorite ? "في المفضلة" : "إضافة للمفضلة"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-wrap gap-2">
              <Badge>{property.classification}</Badge>
              {property.allowWhatsappContact ? <Badge tone="mint">تواصل واتساب</Badge> : null}
              {(property.requiresLeaseContract ?? true) ? (
                <Badge tone="sky">عقد إيجار إلزامي</Badge>
              ) : null}
              <Badge tone={property.status === "published" ? "mint" : "stone"}>
                {property.status === "published"
                  ? "منشور"
                  : property.status === "draft"
                    ? "مسودة"
                    : "متوقف"}
              </Badge>
            </div>
            <label>
              <span className="label">
                {isOwnerPreview ? `وحداتك في ${property.city}` : `وحدات أخرى في ${property.city}`}
              </span>
              <select
                className="field field-select"
                value={property.id}
                onChange={(event) => onProperty(event.target.value)}
                disabled={isOwnerPreview}
              >
                {sameCityProperties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.9fr)] md:p-6">
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-ink">صور السكن</p>
              <p className="text-xs font-bold text-stone-500">
                {imageIndex + 1} / {images.length}
              </p>
            </div>
            <div className="relative">
              <img
                src={activeImage}
                alt={`صورة السكن ${imageIndex + 1}`}
                className="h-[340px] w-full rounded-2xl object-cover lg:h-[540px]"
              />
              {images.length > 1 ? (
                <>
                  <button
                    className="secondary-button absolute left-3 top-1/2 !min-h-11 !rounded-full !px-3 -translate-y-1/2"
                    onClick={nextImage}
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft size={20} aria-hidden="true" />
                  </button>
                  <button
                    className="secondary-button absolute right-3 top-1/2 !min-h-11 !rounded-full !px-3 -translate-y-1/2"
                    onClick={previousImage}
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-6">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    className={`rounded-xl border p-1 transition ${
                      index === imageIndex
                        ? "border-berry bg-fuchsia-50"
                        : "border-stone-200 bg-white"
                    }`}
                    onClick={() => setImageIndex(index)}
                    aria-label={`عرض صورة ${index + 1}`}
                  >
                    <img
                      src={image}
                      alt={`صورة مصغرة ${index + 1}`}
                      className="h-16 w-full rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            {(property.videos ?? []).length > 0 ? (
              <div className="mt-5 rounded-2xl border border-stone-100 bg-linen p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Video size={18} className="text-berry" aria-hidden="true" />
                  <p className="text-sm font-black text-ink">فيديو السكن</p>
                </div>
                <div className="grid gap-3">
                  {(property.videos ?? []).map((video) => (
                    <video
                      key={video}
                      src={video}
                      controls
                      className="h-64 w-full rounded-2xl bg-stone-900 object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="صاحب السكن" value={property.ownerName} />
              <PhoneInfo
                phone={property.ownerPhone}
                allowWhatsapp={Boolean(canUseWhatsapp)}
                disabled={isOwnerPreview}
              />
              <Info label="رقم الرخصة" value={property.propertyLicenseNumber} />
              <Info label="المدينة" value={property.city} />
              <Info label="الحي" value={property.neighborhood} />
              <Info label="العنوان" value={property.address} />
              <Info label="أقرب جامعة/عمل" value={property.universityNearby} />
              <Info label="السعر" value={`${property.price.toLocaleString("ar-SA")} ريال`} />
              <Info label="العقد" value={property.paymentType} />
              <Info
                label="عقد إيجار إلزامي"
                value={(property.requiresLeaseContract ?? true) ? "نعم" : "لا"}
              />
              <Info label="الغرف" value={formatRooms(property)} />
              <Info label="دورات المياه" value={`${property.bathrooms.toLocaleString("ar-SA")}`} />
              <Info label="الأدوار" value={`${property.floorsCount.toLocaleString("ar-SA")}`} />
              <Info
                label="الحد الأعلى للسكان"
                value={`${property.maxResidents.toLocaleString("ar-SA")}`}
              />
              <Info label="مفروش" value={property.furnished ? "نعم" : "لا"} />
              <Info label="المصعد" value={property.hasElevator ? "يوجد" : "لا يوجد"} />
              <Info label="عامل نظافة" value={property.hasCleaningWorker ? "يوجد" : "لا يوجد"} />
              <Info
                label="باص الجامعة"
                value={property.universityBusPasses ? "يمر عليه" : "لا يمر عليه"}
              />
              <Info label="الزمن" value={property.timeText} />
              <Info label="القرب" value={property.distanceText} />
            </dl>

            <div className="mt-4 rounded-2xl bg-linen p-4">
              <p className="font-black text-ink">الخدمات القريبة</p>
              <ul className="mt-2 space-y-2 text-sm text-stone-700">
                {property.services.map((service) => (
                  <li key={service.id}>
                    {service.type}: {service.name} - {formatServiceDistance(service)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-stone-100 p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
          {googleMapsUrl ? (
            isOwnerPreview ? (
              <button className="secondary-button" disabled>
                <MapPinned size={18} aria-hidden="true" />
                فتح الموقع
              </button>
            ) : (
              <a className="secondary-button" href={googleMapsUrl} target="_blank" rel="noreferrer">
                <MapPinned size={18} aria-hidden="true" />
                فتح الموقع
              </a>
            )
          ) : null}
          <button
            className="primary-button"
            onClick={() => setShowRoommateForm(true)}
            disabled={isOwnerPreview}
          >
            <Heart size={18} aria-hidden="true" />
            مهتمة لكن ما زلت أبحث عن شريكة سكن
          </button>
          <button
            className="secondary-button"
            onClick={() => recordInterest("whole-unit")}
            disabled={isOwnerPreview}
          >
            <Home size={18} aria-hidden="true" />
            حجز الآن
          </button>
          <button
            className="secondary-button"
            onClick={() => recordInterest("visit")}
            disabled={isOwnerPreview}
          >
            <CalendarDays size={18} aria-hidden="true" />
            اختيار تاريخ زيارة
          </button>
        </div>

        {message ? (
          <div className="px-4 pb-6 md:px-6">
            <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-7 text-mintdeep">
              {message}
            </p>
          </div>
        ) : null}

        {showRoommateForm && !isOwnerPreview ? (
          <div className="px-4 pb-6 md:px-6">
            <RoommateRequestForm
              property={currentProperty}
              user={user}
              onDone={() => {
                addInterest({ propertyId: currentProperty.id, userId, mode: "roommate" });
                addRoommatePreference({
                  propertyId: currentProperty.id,
                  userId,
                  roomsWanted: 1,
                  acceptsSharedContract: true,
                });
                setMessage("تم حفظ طلبك للبحث عن شريكة سكن. سيظهر ضمن صفحة الباحثات عن شريكة سكن.");
              }}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-linen p-3">
      <dt className="text-xs font-bold text-stone-500">{label}</dt>
      <dd className="mt-1 font-black text-ink">{value}</dd>
    </div>
  );
}

function PhoneInfo({
  phone,
  allowWhatsapp,
  disabled = false,
}: {
  phone: string;
  allowWhatsapp: boolean;
  disabled?: boolean;
}) {
  const url = whatsappUrl(phone);
  return (
    <div className="rounded-xl bg-linen p-3">
      <dt className="text-xs font-bold text-stone-500">الجوال</dt>
      <dd className="mt-1 flex items-center justify-between gap-2 font-black text-ink">
        <span>{maskPhone(phone)}</span>
        {allowWhatsapp && url ? (
          disabled ? (
            <span
              className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full bg-stone-100 text-stone-400"
              aria-disabled="true"
              aria-label="واتساب غير متاح في معاينة صاحب السكن"
            >
              <MessageCircle size={18} aria-hidden="true" />
            </span>
          ) : (
            <a
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-mintdeep transition hover:bg-emerald-200"
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="فتح محادثة واتساب"
            >
              <MessageCircle size={18} aria-hidden="true" />
            </a>
          )
        ) : null}
      </dd>
    </div>
  );
}
