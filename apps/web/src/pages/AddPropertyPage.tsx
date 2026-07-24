import { ArrowRight, Camera, ChevronDown, MapPinned, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import Stepper from "../components/Stepper";
import PropertyLocationPicker from "../components/PropertyLocationPicker";
import { saveProperty } from "../services/propertyService";
import { citiesForRegion, regionForCity, saudiRegions } from "@saknaha/constants/locations";
import type {
  Owner,
  Property,
  PropertyClassification,
  PropertyType,
  RentalPeriod,
  RentalPrices,
} from "@saknaha/shared-types";
import {
  formatRentalPrices,
  formatRooms,
  getGoogleMapsUrl,
  normalizeRentalPrices,
  paymentTypeFromRentalPeriod,
  rentalPeriodLabels,
  rentalPeriodOrder,
} from "@saknaha/utils/propertyFormat";
import {
  isLikelySaudiCoordinate,
  isValidCoordinates,
  parseGoogleMapsLocationUrl,
} from "@saknaha/utils/directions";
import { useMediaService } from "../media/MediaServiceContext";
import { useMapsData } from "../data/MapsDataContext";

const steps = ["الموقع", "معلومات السكن", "السعر والصور", "المراجعة والنشر"];

const classificationOptions: Array<{ label: string; value: PropertyClassification }> = [
  { label: "عمارة نسائية بالكامل", value: "نسائي بالكامل" },
  { label: "دور نسائي في عمارة عوائل", value: "دور نسائي داخل سكن عوائل" },
  { label: "فندق", value: "متاح للجميع" },
  { label: "شقة في عمارة عوائل", value: "عوائل" },
];

const propertyTypeOptions: Array<{ label: string; value: PropertyType }> = [
  { label: "عمارة", value: "عمارة" },
  { label: "شقة", value: "شقة" },
  { label: "فندق", value: "غرفة" },
  { label: "دور", value: "دور" },
];

interface AddPropertyPageProps {
  owner: Owner;
  editing?: Property | null;
  onSaved: () => void;
  onBack: () => void;
}

export default function AddPropertyPage({ owner, editing, onSaved, onBack }: AddPropertyPageProps) {
  const mediaService = useMediaService();
  const mapsData = useMapsData();
  const [step, setStep] = useState(0);
  const [property, setProperty] = useState<Property>(
    () =>
      editing ?? {
        id: "",
        ownerId: owner.id,
        ownerName: owner.fullName,
        ownerPhone: owner.phone,
        title: "",
        propertyLicenseNumber: "",
        region: "",
        city: "",
        neighborhood: "",
        district: "",
        landmark: "",
        address: "",
        universityNearby: "",
        googleMapsUrl: "",
        classification: "نسائي بالكامل",
        propertyType: "عمارة",
        minRooms: 1,
        maxRooms: 3,
        floorsCount: 1,
        hasElevator: false,
        hasCleaningWorker: false,
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 1,
        furnished: true,
        maxResidents: 3,
        roommateAllowed: true,
        requiresLeaseContract: true,
        price: 2000,
        paymentType: "شهري",
        rentalPrices: { monthly: 2000 },
        negotiable: true,
        allowWhatsappContact: true,
        deposit: 0,
        priceNotes: "",
        services: [],
        images: [],
        videos: [],
        status: "draft",
        publicationStatus: "draft",
        distanceText: "",
        timeText: "",
        createdAt: new Date().toISOString(),
      },
  );

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return Boolean(
        property.region?.trim() &&
        property.city.trim() &&
        property.neighborhood.trim() &&
        property.classification &&
        isValidCoordinates(
          property.lat !== undefined && property.lng !== undefined
            ? { lat: property.lat, lng: property.lng }
            : null,
        ),
      );
    }
    if (step === 1) {
      return (
        property.propertyType &&
        property.maxResidents > 0 &&
        property.minRooms > 0 &&
        property.maxRooms >= property.minRooms
      );
    }
    if (step === 2) {
      const prices = property.rentalPrices ?? normalizeRentalPrices(property);
      const selectedPrices = Object.values(prices);
      return (
        selectedPrices.length > 0 &&
        selectedPrices.every((price) => typeof price === "number" && price > 0) &&
        property.images.length > 0
      );
    }
    return true;
  }, [property, step]);

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((current) => ({ ...current, [key]: value }));
  }

  function updateRentalPrices(nextPrices: RentalPrices) {
    setProperty((current) => {
      const primary = rentalPeriodOrder
        .map((period) => ({ period, price: nextPrices[period] }))
        .find(
          (entry): entry is { period: RentalPeriod; price: number } =>
            typeof entry.price === "number" && entry.price > 0,
        );
      return {
        ...current,
        rentalPrices: nextPrices,
        price: primary?.price ?? 0,
        paymentType: primary ? paymentTypeFromRentalPeriod(primary.period) : current.paymentType,
      };
    });
  }

  function stopFormSubmit(event: FormEvent) {
    event.preventDefault();
  }

  function updateRooms(key: "minRooms" | "maxRooms", value: string) {
    const numeric = Number(value.replace(/\D/g, ""));
    if (!numeric) {
      update(key, 0);
      return;
    }
    if (key === "minRooms") {
      update("minRooms", numeric);
      if (property.maxRooms && property.maxRooms < numeric) update("maxRooms", numeric);
      return;
    }
    update("maxRooms", Math.max(numeric, property.minRooms || 1));
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((file) => mediaService.uploadImage(file)),
      );
      update("images", [...property.images, ...uploaded.map((item) => item.url)]);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "فشل رفع الصور. يرجى المحاولة مرة أخرى.",
      );
    }
  }

  async function publish(publicationStatus: "pending_review" | "draft") {
    let location = {
      googleMapsUrl: property.googleMapsUrl.trim(),
      lat: property.lat,
      lng: property.lng,
      locationVisibility: property.locationVisibility,
    };
    if (location.googleMapsUrl) {
      const parsed = await mapsData.resolveLocationLink(location.googleMapsUrl);
      if (!parsed.ok) {
        window.alert(googleMapsLinkError(parsed.reason));
        return;
      }
      if (
        !isLikelySaudiCoordinate(parsed.coordinates) &&
        !window.confirm("الإحداثيات خارج النطاق المعتاد للسعودية. هل تريدين حفظها بعد التحقق منها؟")
      ) {
        return;
      }
      location = {
        googleMapsUrl: parsed.normalizedUrl,
        lat: parsed.coordinates.lat,
        lng: parsed.coordinates.lng,
        locationVisibility: location.locationVisibility ?? "exact",
      };
    }
    const coordinatesVerified = isValidCoordinates(
      location.lat !== undefined && location.lng !== undefined
        ? { lat: location.lat, lng: location.lng }
        : null,
    );
    if (
      publicationStatus === "pending_review" &&
      (!property.region?.trim() ||
        !property.city.trim() ||
        !property.neighborhood.trim() ||
        !coordinatesVerified ||
        property.images.length === 0)
    ) {
      window.alert("المنطقة والمدينة والحي والإحداثيات وصورة واحدة على الأقل مطلوبة.");
      return;
    }
    saveProperty({
      ...property,
      ...location,
      status: publicationStatus === "draft" ? "draft" : "pending_review",
      publicationStatus,
      submittedAt:
        publicationStatus === "pending_review" ? new Date().toISOString() : property.submittedAt,
      rejectionReason: undefined,
      title: property.title || selectedClassificationLabel(property.classification),
      address: property.address || `${property.city} - ${property.neighborhood}`,
      propertyLicenseNumber: property.propertyLicenseNumber || "غير محدد",
      universityNearby: property.universityNearby || "غير محدد",
      distanceText: property.distanceText,
      timeText: property.timeText,
      ownerId: owner.id,
      ownerName: owner.fullName,
      ownerPhone: owner.phone,
    });
    if (publicationStatus === "pending_review") {
      window.alert("تم إرسال إعلانك لمراجعة الإدارة. الحالة الحالية: بانتظار المراجعة.");
    }
    onSaved();
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 md:py-8" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        رجوع إلى لوحة التحكم
      </button>

      <section className="panel">
        <div className="mb-6 text-right">
          <p className="text-sm font-black text-mintdeep">
            {editing ? "تعديل وحدة سكنية" : "إضافة سكن"}
          </p>
          <h1 className="text-3xl font-black text-ink">بيانات السكن</h1>
        </div>

        <Stepper steps={steps} currentStep={step} />

        {step === steps.length - 1 ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              السابق
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                className="secondary-button"
                onClick={() => void publish("draft")}
                type="button"
              >
                حفظ كمسودة
              </button>
              <button
                className="primary-button"
                onClick={() => void publish("pending_review")}
                type="button"
              >
                إرسال للمراجعة
              </button>
            </div>
          </div>
        ) : null}

        <form className="mt-6" onSubmit={stopFormSubmit}>
          {step === 0 ? <LocationStep property={property} update={update} /> : null}
          {step === 1 ? (
            <DetailsStep property={property} update={update} updateRooms={updateRooms} />
          ) : null}
          {step === 2 ? (
            <MediaStep
              property={property}
              update={update}
              updateRentalPrices={updateRentalPrices}
              uploadImages={uploadImages}
            />
          ) : null}
          {step === 3 ? <ReviewStep property={property} /> : null}
        </form>

        {step < steps.length - 1 ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              السابق
            </button>
            <button
              className="primary-button"
              disabled={!canGoNext}
              onClick={() => setStep((current) => current + 1)}
              type="button"
            >
              التالي
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

type UpdateFn = <K extends keyof Property>(key: K, value: Property[K]) => void;

function LocationStep({ property, update }: { property: Property; update: UpdateFn }) {
  const mapsData = useMapsData();
  const [mapsLinkError, setMapsLinkError] = useState("");
  const [resolvingLink, setResolvingLink] = useState(false);
  const availableCities = citiesForRegion(property.region ?? "");

  async function validateMapsLink() {
    if (!property.googleMapsUrl.trim()) {
      setMapsLinkError("");
      return;
    }
    setResolvingLink(true);
    const parsed = await mapsData.resolveLocationLink(property.googleMapsUrl);
    setResolvingLink(false);
    if (!parsed.ok) {
      setMapsLinkError(googleMapsLinkError(parsed.reason));
      return;
    }
    setMapsLinkError("");
    update("googleMapsUrl", parsed.normalizedUrl);
    update("lat", parsed.coordinates.lat);
    update("lng", parsed.coordinates.lng);
    if (!property.locationVisibility) update("locationVisibility", "exact");
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Select
        label="المنطقة *"
        value={property.region ?? ""}
        options={[
          { label: "اختاري المنطقة", value: "" },
          ...saudiRegions.map((region) => ({ label: region.name, value: region.name })),
        ]}
        onChange={(value) => {
          update("region", value);
          const cities = citiesForRegion(value);
          if (!cities.includes(property.city)) update("city", cities[0] ?? "");
        }}
      />
      <Select
        label="المدينة *"
        value={property.city}
        options={[
          { label: "اختاري المدينة", value: "" },
          ...availableCities.map((city) => ({ label: city, value: city })),
        ]}
        onChange={(value) => {
          update("city", value);
          if (!property.region) update("region", regionForCity(value));
        }}
      />
      <Input
        label="الحي *"
        placeholder="مثال: النزهة"
        value={property.neighborhood}
        onChange={(value) => {
          update("neighborhood", value);
          update("district", value);
        }}
      />
      <Input
        label="معلم قريب (اختياري)"
        placeholder="جامعة، مستشفى، شركة، مركز تسوق أو مسجد"
        value={property.landmark ?? ""}
        onChange={(value) => update("landmark", value)}
      />
      <Select
        label="التصنيف"
        value={property.classification}
        options={classificationOptions}
        onChange={(value) => update("classification", value as PropertyClassification)}
      />
      <Input
        label="العنوان المختصر"
        placeholder="مثال: قريب من الجامعة والخدمات"
        value={property.address}
        onChange={(value) => update("address", value)}
      />
      <Input
        label="رقم رخصة السكن"
        placeholder="اختياري"
        value={property.propertyLicenseNumber}
        onChange={(value) => update("propertyLicenseNumber", value)}
      />
      <label className="md:col-span-2">
        <span className="label">رابط Google Maps</span>
        <div className="relative">
          <input
            className="field pr-12"
            dir="ltr"
            placeholder="https://maps.app.goo.gl/... أو https://www.google.com/maps/..."
            value={property.googleMapsUrl}
            onChange={(event) => {
              setMapsLinkError("");
              update("googleMapsUrl", event.target.value);
            }}
            onBlur={() => void validateMapsLink()}
            aria-invalid={Boolean(mapsLinkError)}
          />
          <MapPinned
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500"
            size={18}
            aria-hidden="true"
          />
        </div>
        {resolvingLink ? (
          <p className="mt-2 text-sm font-bold text-stone-600">جاري التحقق من الرابط...</p>
        ) : null}
        {mapsLinkError ? (
          <p className="mt-2 text-sm font-bold text-rose-700" role="alert">
            {mapsLinkError}
          </p>
        ) : null}
      </label>
      <Select
        label="دقة عرض موقع السكن"
        value={property.locationVisibility ?? "exact"}
        options={[
          { label: "الموقع الدقيق", value: "exact" },
          { label: "موقع تقريبي", value: "approximate" },
          { label: "خاص", value: "private" },
        ]}
        onChange={(value) =>
          update("locationVisibility", value as NonNullable<Property["locationVisibility"]>)
        }
      />
      <PropertyLocationPicker
        value={
          property.lat !== undefined && property.lng !== undefined
            ? { lat: property.lat, lng: property.lng }
            : null
        }
        onChange={(coordinates) => {
          update("lat", coordinates.lat);
          update("lng", coordinates.lng);
          update(
            "googleMapsUrl",
            getGoogleMapsUrl({ ...property, ...coordinates }, { canViewExact: true }) ?? "",
          );
          if (!property.locationVisibility) update("locationVisibility", "exact");
        }}
      />
      <div className="grid gap-2 rounded-2xl bg-linen p-4 md:col-span-2 xl:col-span-3">
        <p className="font-black text-ink">ملخص الموقع</p>
        <p>✓ المنطقة: {property.region || "غير محددة"}</p>
        <p>✓ المدينة: {property.city || "غير محددة"}</p>
        <p>✓ الحي: {property.neighborhood || "غير محدد"}</p>
        <p>✓ المعلم: {property.landmark || "غير مضاف"}</p>
        <p>
          {isValidCoordinates(
            property.lat !== undefined && property.lng !== undefined
              ? { lat: property.lat, lng: property.lng }
              : null,
          )
            ? "✓ الإحداثيات موثقة"
            : "○ الإحداثيات غير محددة"}
        </p>
      </div>
    </div>
  );
}

function DetailsStep({
  property,
  update,
  updateRooms,
}: {
  property: Property;
  update: UpdateFn;
  updateRooms: (key: "minRooms" | "maxRooms", value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Select
        label="نوع السكن"
        value={property.propertyType}
        options={propertyTypeOptions}
        onChange={(value) => update("propertyType", value as PropertyType)}
      />
      <Input
        label="العدد المتاح"
        placeholder="مثال: 3"
        value={property.maxResidents ? String(property.maxResidents) : ""}
        inputMode="numeric"
        onChange={(value) => update("maxResidents", Number(value.replace(/\D/g, "")) || 0)}
      />
      <Input
        label="عدد الغرف من"
        placeholder="1"
        value={property.minRooms ? String(property.minRooms) : ""}
        inputMode="numeric"
        onChange={(value) => updateRooms("minRooms", value)}
      />
      <Input
        label="عدد الغرف إلى"
        placeholder="3"
        value={property.maxRooms ? String(property.maxRooms) : ""}
        inputMode="numeric"
        onChange={(value) => updateRooms("maxRooms", value)}
      />
      <Input
        label="عدد دورات المياه"
        placeholder="مثال: 2"
        value={property.bathrooms ? String(property.bathrooms) : ""}
        inputMode="numeric"
        onChange={(value) => update("bathrooms", Number(value.replace(/\D/g, "")) || 0)}
      />
      <Toggle
        label="هل السكن مفروش؟"
        checked={property.furnished}
        onChange={(value) => update("furnished", value)}
      />
    </div>
  );
}

function MediaStep({
  property,
  update,
  updateRentalPrices,
  uploadImages,
}: {
  property: Property;
  update: UpdateFn;
  updateRentalPrices: (prices: RentalPrices) => void;
  uploadImages: (files: FileList | null) => void;
}) {
  const prices = property.rentalPrices ?? normalizeRentalPrices(property);

  function toggleRentalPeriod(period: RentalPeriod, enabled: boolean) {
    const next = { ...prices };
    if (enabled) next[period] = next[period] ?? 0;
    else delete next[period];
    updateRentalPrices(next);
  }

  function setRentalPrice(period: RentalPeriod, value: string) {
    updateRentalPrices({
      ...prices,
      [period]: Number(value.replace(/\D/g, "")) || 0,
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        <fieldset className="rounded-2xl border border-stone-200 bg-linen p-4">
          <legend className="px-2 text-sm font-black text-ink">فترات الإيجار والأسعار</legend>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rentalPeriodOrder.map((period) => {
              const selected = Object.prototype.hasOwnProperty.call(prices, period);
              return (
                <div className="rounded-xl bg-white p-3" key={period}>
                  <label className="flex items-center gap-2 font-black text-ink">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => toggleRentalPeriod(period, event.target.checked)}
                    />
                    {rentalPeriodLabels[period]}
                  </label>
                  {selected ? (
                    <label className="mt-3 block">
                      <span className="label">السعر بالريال</span>
                      <input
                        className="field"
                        inputMode="numeric"
                        placeholder="مثال: 2000"
                        value={prices[period] ? String(prices[period]) : ""}
                        onChange={(event) => setRentalPrice(period, event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      </div>

      <label>
        <span className="label inline-flex items-center gap-2">
          <Camera size={18} aria-hidden="true" />
          رفع صور السكن
        </span>
        <input
          className="field"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => uploadImages(event.target.files)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {property.images.map((image, index) => (
          <div className="relative" key={`${image}-${index}`}>
            <img src={image} alt="صورة السكن" className="h-40 w-full rounded-2xl object-cover" />
            {index === 0 ? (
              <span className="absolute right-3 top-3 rounded-full bg-berry px-3 py-1 text-xs font-black text-white">
                صورة الغلاف
              </span>
            ) : (
              <button
                className="secondary-button absolute bottom-3 right-3 !min-h-9 !px-3 text-xs"
                type="button"
                onClick={() =>
                  update("images", [
                    image,
                    ...property.images.filter((_, imageIndex) => imageIndex !== index),
                  ])
                }
              >
                اجعلها غلافاً
              </button>
            )}
            <button
              className="danger-button absolute left-3 top-3 !min-h-10 !px-3"
              type="button"
              onClick={() =>
                update(
                  "images",
                  property.images.filter((_, imageIndex) => imageIndex !== index),
                )
              }
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ property }: { property: Property }) {
  const googleMapsUrl = getGoogleMapsUrl(property, { canViewExact: true });
  const items = [
    ["المنطقة", property.region || "غير محددة"],
    ["المدينة", property.city],
    ["الحي", property.neighborhood],
    ["المعلم", property.landmark || "غير مضاف"],
    ["التصنيف", selectedClassificationLabel(property.classification)],
    ["نوع السكن", selectedPropertyTypeLabel(property.propertyType)],
    ["العدد المتاح", property.maxResidents.toLocaleString("ar-SA")],
    ["عدد الغرف", formatRooms(property)],
    ["الأسعار", formatRentalPrices(property)],
    ["رابط Google Maps", googleMapsUrl ? "مضاف" : "غير مضاف"],
    [
      "الإحداثيات",
      isValidCoordinates(
        property.lat !== undefined && property.lng !== undefined
          ? { lat: property.lat, lng: property.lng }
          : null,
      )
        ? "موثقة"
        : "غير محددة",
    ],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <img
        src={property.images[0]}
        alt="صورة السكن"
        className="h-72 w-full rounded-2xl object-cover"
      />
      <div className="rounded-2xl bg-linen p-5">
        <h2 className="text-2xl font-black text-ink">مراجعة نهائية قبل النشر</h2>
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map(([label, value]) => (
            <div className="rounded-xl bg-white/80 p-3" key={label}>
              <dt className="text-xs font-bold text-stone-500">{label}</dt>
              <dd className="mt-1 font-black text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {googleMapsUrl ? (
          <a
            className="secondary-button mt-4 w-full"
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPinned size={18} aria-hidden="true" />
            فتح موقع السكن في Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}

function googleMapsLinkError(
  reason: Exclude<ReturnType<typeof parseGoogleMapsLocationUrl>, { ok: true }>["reason"],
) {
  switch (reason) {
    case "short_url":
      return "روابط Google Maps المختصرة غير مدعومة. انسخي الرابط الكامل الذي يحتوي على الإحداثيات.";
    case "unsupported_protocol":
    case "unsupported_host":
      return "الرابط غير مدعوم. استخدمي رابط HTTPS رسميًا من Google Maps فقط.";
    case "missing_coordinates":
      return "لا يحتوي رابط Google Maps على إحداثيات واضحة للموقع.";
    case "suspected_swap":
      return "يبدو أن خط العرض وخط الطول معكوسان. تحققي من الرابط ثم حاولي مرة أخرى.";
    case "invalid_coordinates":
      return "إحداثيات الموقع غير صالحة.";
    default:
      return "رابط Google Maps غير صالح.";
  }
}

function selectedClassificationLabel(value: PropertyClassification) {
  return classificationOptions.find((option) => option.value === value)?.label ?? value;
}

function selectedPropertyTypeLabel(value: PropertyType) {
  return propertyTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <span className="relative block">
        <select
          className="field field-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500"
          size={18}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={checked ? "primary-button" : "secondary-button"}
          onClick={() => onChange(true)}
        >
          نعم
        </button>
        <button
          type="button"
          className={!checked ? "primary-button" : "secondary-button"}
          onClick={() => onChange(false)}
        >
          لا
        </button>
      </div>
    </div>
  );
}
