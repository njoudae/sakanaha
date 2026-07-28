import {
  ArrowRight,
  Camera,
  ChevronDown,
  Loader2,
  MapPinned,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import Stepper from "../components/Stepper";
import PropertyLocationPicker from "../components/PropertyLocationPicker";
import { cityNames } from "@saknaha/constants/cities";
import { regionForCity } from "@saknaha/constants/locations";
import type {
  Owner,
  Property,
  PropertyClassification,
  PropertyFacility,
  PropertyFeature,
  PropertyType,
  RentIncludedUtility,
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
import { isValidCoordinates, parseGoogleMapsLocationUrl } from "@saknaha/utils/directions";
import { useMediaService } from "../media/MediaServiceContext";
import type { MediaUploadProgress } from "../media/MediaService";
import { useMapsData } from "../data/MapsDataContext";
import { getAvailabilityStatus } from "../services/propertyAvailability";
import {
  propertyFacilityOptions,
  propertyFeatureOptions,
  rentIncludedOptions,
} from "../services/propertyAmenities";
import { saveProperty } from "../services/propertyService";

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
        minRooms: 0,
        maxRooms: 0,
        floorsCount: 0,
        hasElevator: false,
        hasCleaningWorker: false,
        features: [],
        facilities: [],
        rentIncludes: [],
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 0,
        furnished: true,
        maxResidents: 0,
        totalUnits: 0,
        availableUnits: 0,
        availabilityStatus: "available",
        roommateAllowed: true,
        requiresLeaseContract: true,
        price: 0,
        paymentType: "شهري",
        rentalPrices: {},
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
  const [primaryRentalPeriod, setPrimaryRentalPeriod] = useState<RentalPeriod>(() => {
    if (!editing) return "monthly";
    const prices = editing.rentalPrices ?? normalizeRentalPrices(editing);
    return (
      rentalPeriodOrder.find(
        (period) =>
          prices[period] === editing.price &&
          paymentTypeFromRentalPeriod(period) === editing.paymentType,
      ) ??
      rentalPeriodOrder.find((period) => typeof prices[period] === "number") ??
      "monthly"
    );
  });
  const [uploadProgress, setUploadProgress] = useState<Record<string, MediaUploadProgress>>({});
  const [mediaError, setMediaError] = useState("");
  const isUploading = Object.keys(uploadProgress).length > 0;

  const canGoNext = !isUploading;

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((current) => ({ ...current, [key]: value }));
  }

  function updateRentalPrices(
    nextPrices: RentalPrices,
    requestedPrimaryPeriod = primaryRentalPeriod,
  ) {
    const configuredPeriods = rentalPeriodOrder.filter((period) =>
      Object.prototype.hasOwnProperty.call(nextPrices, period),
    );
    const selectedPrimaryPeriod = configuredPeriods.includes(requestedPrimaryPeriod)
      ? requestedPrimaryPeriod
      : configuredPeriods[0];
    if (selectedPrimaryPeriod) setPrimaryRentalPeriod(selectedPrimaryPeriod);

    setProperty((current) => ({
      ...current,
      rentalPrices: nextPrices,
      price: selectedPrimaryPeriod ? (nextPrices[selectedPrimaryPeriod] ?? 0) : 0,
      paymentType: selectedPrimaryPeriod
        ? paymentTypeFromRentalPeriod(selectedPrimaryPeriod)
        : current.paymentType,
    }));
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

  function updateUnitCount(value: string) {
    const units = Number(value.replace(/\D/g, "")) || 0;
    setProperty((current) => ({
      ...current,
      maxResidents: units,
      totalUnits: units,
      availableUnits: units,
      availabilityStatus: getAvailabilityStatus({
        ...current,
        maxResidents: units,
        totalUnits: units,
        availableUnits: units,
      }),
    }));
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setMediaError("");
    const selected = Array.from(files).map((file, index) => ({
      file,
      key: `image-${Date.now()}-${index}-${file.name}`,
      previewUrl: URL.createObjectURL(file),
    }));
    setProperty((current) => ({
      ...current,
      images: [...current.images, ...selected.map((item) => item.previewUrl)],
    }));
    setUploadProgress((current) => ({
      ...current,
      ...Object.fromEntries(
        selected.map((item) => [
          item.key,
          { fileName: item.file.name, phase: "preparing" as const, percent: 0 },
        ]),
      ),
    }));

    const results = await Promise.allSettled(
      selected.map((item) =>
        mediaService.uploadImage(item.file, {
          onProgress: (progress) =>
            setUploadProgress((current) => ({ ...current, [item.key]: progress })),
        }),
      ),
    );
    setProperty((current) => {
      const images = [...current.images];
      selected.forEach((item, index) => {
        const previewIndex = images.indexOf(item.previewUrl);
        const result = results[index];
        if (previewIndex < 0) return;
        if (result.status === "fulfilled") images[previewIndex] = result.value.url;
        else images.splice(previewIndex, 1);
      });
      return { ...current, images };
    });
    selected.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadProgress((current) => {
      const next = { ...current };
      selected.forEach((item) => delete next[item.key]);
      return next;
    });
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      const reason = failed[0]?.status === "rejected" ? failed[0].reason : null;
      setMediaError(
        reason instanceof Error
          ? reason.message
          : `تعذر رفع ${failed.length.toLocaleString("ar-SA")} من الصور. أعيدي المحاولة.`,
      );
    }
  }

  async function uploadVideos(files: FileList | null) {
    if (!files?.length) return;
    setMediaError("");
    const selected = Array.from(files).map((file, index) => ({
      file,
      key: `video-${Date.now()}-${index}-${file.name}`,
      previewUrl: URL.createObjectURL(file),
    }));
    setProperty((current) => ({
      ...current,
      videos: [...(current.videos ?? []), ...selected.map((item) => item.previewUrl)],
    }));
    setUploadProgress((current) => ({
      ...current,
      ...Object.fromEntries(
        selected.map((item) => [
          item.key,
          { fileName: item.file.name, phase: "preparing" as const, percent: 0 },
        ]),
      ),
    }));
    const results = await Promise.allSettled(
      selected.map((item) =>
        mediaService.uploadVideo(item.file, {
          onProgress: (progress) =>
            setUploadProgress((current) => ({ ...current, [item.key]: progress })),
        }),
      ),
    );
    setProperty((current) => {
      const videos = [...(current.videos ?? [])];
      selected.forEach((item, index) => {
        const previewIndex = videos.indexOf(item.previewUrl);
        const result = results[index];
        if (previewIndex < 0) return;
        if (result.status === "fulfilled") videos[previewIndex] = result.value.url;
        else videos.splice(previewIndex, 1);
      });
      return { ...current, videos };
    });
    selected.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadProgress((current) => {
      const next = { ...current };
      selected.forEach((item) => delete next[item.key]);
      return next;
    });
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      const reason = failed[0]?.status === "rejected" ? failed[0].reason : null;
      setMediaError(
        reason instanceof Error
          ? reason.message
          : `تعذر رفع ${failed.length.toLocaleString("ar-SA")} من الفيديوهات. أعيدي المحاولة.`,
      );
    }
  }

  function publish(publicationStatus: "pending_review" | "draft") {
    const submittedAt = new Date().toISOString();
    const savedProperty = saveProperty({
      ...property,
      status: publicationStatus,
      publicationStatus,
      paymentCompleted: publicationStatus === "pending_review",
      submittedAt: publicationStatus === "pending_review" ? submittedAt : property.submittedAt,
      rejectionReason: undefined,
    });
    window.alert(
      publicationStatus === "draft"
        ? "تم حفظ المسودة في نسخة الواجهات."
        : savedProperty.publicationStatus === "approved"
          ? "تمت الموافقة على العقار ونشره مباشرة. سيظهر الآن في الصفحة الرئيسية."
          : "اكتملت معاينة الدفع بقيمة 150 ريال وتم إرسال العقار للمراجعة.",
    );
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
          <h1 className="text-2xl font-black text-ink">بيانات السكن</h1>
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
              <p className="sm:col-span-2 flex flex-wrap items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
                <span>رسوم نشر الإعلان:</span>
                <span className="text-stone-500 line-through decoration-2">300 ريال</span>
                <span>150 ريال بعد الخصم</span>
              </p>
              <button className="secondary-button" onClick={() => publish("draft")} type="button">
                معاينة المسودة
              </button>
              <button
                className="primary-button"
                onClick={() => publish("pending_review")}
                type="button"
              >
                الدفع وإرسال للمعاينة
              </button>
            </div>
          </div>
        ) : null}

        <form className="mt-6" onSubmit={stopFormSubmit}>
          {step === 0 ? <LocationStep property={property} update={update} /> : null}
          {step === 1 ? (
            <DetailsStep
              property={property}
              update={update}
              updateRooms={updateRooms}
              updateUnitCount={updateUnitCount}
            />
          ) : null}
          {step === 2 ? (
            <MediaStep
              property={property}
              update={update}
              updateRentalPrices={updateRentalPrices}
              primaryRentalPeriod={primaryRentalPeriod}
              uploadImages={uploadImages}
              uploadVideos={uploadVideos}
              uploadProgress={Object.entries(uploadProgress).map(([id, progress]) => ({
                id,
                progress,
              }))}
              mediaError={mediaError}
            />
          ) : null}
          {step === 3 ? (
            <ReviewStep property={property} primaryRentalPeriod={primaryRentalPeriod} />
          ) : null}
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
  const [locationMethod, setLocationMethod] = useState<"current" | "link" | "map" | null>(
    property.googleMapsUrl ? "link" : property.lat !== undefined ? "map" : null,
  );
  const [locationMessage, setLocationMessage] = useState("");

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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }
    setLocationMessage("جاري تحديد الموقع...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        update("lat", coords.latitude);
        update("lng", coords.longitude);
        update(
          "googleMapsUrl",
          getGoogleMapsUrl(
            { ...property, lat: coords.latitude, lng: coords.longitude },
            { canViewExact: true },
          ) ?? "",
        );
        setLocationMessage("تم تحديد الموقع الحالي والتحقق من الإحداثيات.");
      },
      () => setLocationMessage("تعذر الوصول إلى الموقع. تحققي من إذن الموقع ثم حاولي مجدداً."),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="اسم السكن"
        placeholder="مثال: عمارة روند"
        value={property.title}
        onChange={(value) => update("title", value)}
      />
      <Select
        label="المدينة"
        value={property.city}
        options={[
          { label: "اختاري المدينة", value: "" },
          ...cityNames.map((city) => ({ label: city, value: city })),
        ]}
        onChange={(value) => {
          update("city", value);
          update("region", regionForCity(value));
        }}
      />
      <p className="self-end pb-3 text-xs font-bold text-stone-500 md:col-span-1">
        مثال: أبها، خميس مشيط، محايل، بيشة، النماص
      </p>
      <Input
        label="الحي"
        placeholder="مثال: النزهة"
        value={property.neighborhood}
        onChange={(value) => {
          update("neighborhood", value);
          update("district", value);
        }}
      />
      <LandmarksEditor
        primaryLandmark={property.landmark ?? ""}
        onPrimaryLandmark={(value) => update("landmark", value)}
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
        label="رقم ترخيص الإعلان"
        placeholder="اختياري"
        value={property.propertyLicenseNumber}
        onChange={(value) => update("propertyLicenseNumber", value)}
      />
      <fieldset className="grid gap-3 rounded-xl border border-stone-200 bg-linen p-4 md:col-span-2 xl:col-span-3">
        <legend className="px-2 text-sm font-black text-ink">اختاري طريقة تحديد الموقع</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "current", label: "الموقع الحالي" },
            { value: "link", label: "رابط Google Maps" },
            { value: "map", label: "تحديد على الخريطة" },
          ].map((method) => (
            <button
              key={method.value}
              className={locationMethod === method.value ? "primary-button" : "secondary-button"}
              onClick={() => {
                setLocationMethod(method.value as "current" | "link" | "map");
                setLocationMessage("");
              }}
              type="button"
            >
              {method.label}
            </button>
          ))}
        </div>

        {locationMethod === "current" ? (
          <div>
            <button className="secondary-button w-full" type="button" onClick={useCurrentLocation}>
              <MapPinned size={18} aria-hidden="true" />
              تحديد موقعي الآن
            </button>
            {locationMessage ? (
              <p className="mt-2 text-sm font-bold text-stone-600">{locationMessage}</p>
            ) : null}
          </div>
        ) : null}

        {locationMethod === "link" ? (
          <label>
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
        ) : null}

        {locationMethod === "map" ? (
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
        ) : null}
      </fieldset>
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
      <div className="grid gap-2 rounded-2xl bg-linen p-4 md:col-span-2 xl:col-span-3">
        <p className="font-black text-ink">ملخص الموقع</p>
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

function LandmarksEditor({
  primaryLandmark,
  onPrimaryLandmark,
}: {
  primaryLandmark: string;
  onPrimaryLandmark: (value: string) => void;
}) {
  const [landmarks, setLandmarks] = useState([
    { id: "landmark-1", name: primaryLandmark, url: "" },
  ]);

  function updateLandmark(id: string, key: "name" | "url", value: string) {
    setLandmarks((current) =>
      current.map((landmark) => (landmark.id === id ? { ...landmark, [key]: value } : landmark)),
    );
  }

  return (
    <fieldset className="grid gap-3 border border-stone-200 bg-linen p-4 md:col-span-2 xl:col-span-3">
      <legend className="px-2 text-sm font-black text-ink">المعالم القريبة</legend>
      <p className="text-xs font-bold text-stone-500">
        أضف اسم كل معلم ورابطه في Google Maps، ثم اختر المعلم الأشهر الذي سيظهر في البطاقة.
      </p>
      <div className="grid gap-2">
        {landmarks.map((landmark, index) => (
          <div
            className="grid gap-2 border border-stone-200 bg-white p-3 md:grid-cols-[1fr_1.4fr_auto]"
            key={landmark.id}
          >
            <input
              className="field"
              value={landmark.name}
              placeholder={`اسم المعلم ${index + 1}`}
              onChange={(event) => {
                updateLandmark(landmark.id, "name", event.target.value);
                if (primaryLandmark === landmark.name || (!primaryLandmark && index === 0)) {
                  onPrimaryLandmark(event.target.value);
                }
              }}
            />
            <input
              className="field"
              dir="ltr"
              value={landmark.url}
              placeholder="رابط Google Maps للمعلم"
              onChange={(event) => updateLandmark(landmark.id, "url", event.target.value)}
            />
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 px-2 text-xs font-extrabold text-berry">
              <input
                type="radio"
                name="primary-landmark"
                checked={Boolean(landmark.name) && primaryLandmark === landmark.name}
                onChange={() => onPrimaryLandmark(landmark.name)}
              />
              الأشهر
            </label>
          </div>
        ))}
      </div>
      <button
        className="secondary-button w-fit"
        type="button"
        onClick={() =>
          setLandmarks((current) => [
            ...current,
            { id: `landmark-${Date.now()}`, name: "", url: "" },
          ])
        }
      >
        <Plus size={16} aria-hidden="true" />
        إضافة معلم آخر
      </button>
    </fieldset>
  );
}

function DetailsStep({
  property,
  update,
  updateRooms,
  updateUnitCount,
}: {
  property: Property;
  update: UpdateFn;
  updateRooms: (key: "minRooms" | "maxRooms", value: string) => void;
  updateUnitCount: (value: string) => void;
}) {
  function toggleFeature(value: PropertyFeature, checked: boolean) {
    const features = checked
      ? [...new Set([...(property.features ?? []), value])]
      : (property.features ?? []).filter((item) => item !== value);
    update("features", features);
    if (value === "cleaning_worker") update("hasCleaningWorker", checked);
    if (value === "elevator") update("hasElevator", checked);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Select
        label="نوع السكن"
        value={property.propertyType}
        options={propertyTypeOptions}
        onChange={(value) => update("propertyType", value as PropertyType)}
      />
      <Input
        label="عدد الوحدات المتاحة"
        placeholder="مثال: 3"
        value={property.availableUnits ? String(property.availableUnits) : ""}
        inputMode="numeric"
        onChange={updateUnitCount}
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
      <Input
        label="عدد الأدوار"
        placeholder="مثال: 4"
        value={property.floorsCount ? String(property.floorsCount) : ""}
        inputMode="numeric"
        onChange={(value) => update("floorsCount", Number(value.replace(/\D/g, "")) || 0)}
      />
      <Toggle
        label="هل السكن مفروش؟"
        checked={property.furnished}
        onChange={(value) => update("furnished", value)}
      />
      <Toggle
        label="تتوفر مواصلات"
        checked={property.hasTransportService}
        onChange={(value) => update("hasTransportService", value)}
      />
      <Toggle
        label="يمر باص الجامعة"
        checked={property.universityBusPasses}
        onChange={(value) => update("universityBusPasses", value)}
      />
      <ChecklistGroup
        legend="مميزات السكن"
        options={propertyFeatureOptions}
        selected={property.features ?? []}
        onToggle={toggleFeature}
      />
      <ChecklistGroup
        legend="المرافق القريبة"
        options={propertyFacilityOptions}
        selected={property.facilities ?? []}
        onToggle={(value, checked) =>
          update(
            "facilities",
            checked
              ? [...new Set([...(property.facilities ?? []), value])]
              : (property.facilities ?? []).filter((item) => item !== value),
          )
        }
      />
      <ChecklistGroup
        legend="الإيجار يشمل"
        options={rentIncludedOptions}
        selected={property.rentIncludes ?? []}
        onToggle={(value, checked) =>
          update(
            "rentIncludes",
            checked
              ? [...new Set([...(property.rentIncludes ?? []), value])]
              : (property.rentIncludes ?? []).filter((item) => item !== value),
          )
        }
      />
    </div>
  );
}

function ChecklistGroup<T extends PropertyFeature | PropertyFacility | RentIncludedUtility>({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T, checked: boolean) => void;
}) {
  return (
    <fieldset className="rounded-2xl border border-stone-200 bg-linen p-4 md:col-span-2 xl:col-span-3">
      <legend className="px-2 text-sm font-black text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-black transition ${
              selected.includes(option.value)
                ? "border-berry bg-white text-berry"
                : "border-stone-200 bg-white/80 text-ink"
            }`}
          >
            <input
              type="checkbox"
              className="h-5 w-5 accent-berry"
              checked={selected.includes(option.value)}
              onChange={(event) => onToggle(option.value, event.target.checked)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function MediaStep({
  property,
  update,
  updateRentalPrices,
  primaryRentalPeriod,
  uploadImages,
  uploadVideos,
  uploadProgress,
  mediaError,
}: {
  property: Property;
  update: UpdateFn;
  updateRentalPrices: (prices: RentalPrices, primaryPeriod?: RentalPeriod) => void;
  primaryRentalPeriod: RentalPeriod;
  uploadImages: (files: FileList | null) => void;
  uploadVideos: (files: FileList | null) => void;
  uploadProgress: Array<{ id: string; progress: MediaUploadProgress }>;
  mediaError: string;
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
                    <div className="mt-3 grid gap-3">
                      <label>
                        <span className="label">السعر بالريال</span>
                        <input
                          className="field"
                          inputMode="numeric"
                          placeholder="مثال: 2000"
                          value={prices[period] ? String(prices[period]) : ""}
                          onChange={(event) => setRentalPrice(period, event.target.value)}
                        />
                      </label>
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black ${
                          primaryRentalPeriod === period
                            ? "border-berry bg-berry/5 text-berry"
                            : "border-stone-200 text-stone-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="primary-rental-price"
                          checked={primaryRentalPeriod === period}
                          onChange={() => updateRentalPrices(prices, period)}
                        />
                        إظهار هذا السعر في الصفحة الرئيسية
                      </label>
                    </div>
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
        <span className="mb-2 block text-xs font-bold text-stone-500">
          يمكنك اختيار أكثر من صورة دفعة واحدة، وستظهر هنا للمعاينة. أول صورة هي الغلاف.
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

      <label>
        <span className="label inline-flex items-center gap-2">
          <Video size={18} aria-hidden="true" />
          رفع فيديو السكن
        </span>
        <span className="mb-2 block text-xs font-bold text-stone-500">
          يمكنك اختيار أكثر من فيديو بصيغة MP4 أو WebM أو MOV.
        </span>
        <input
          className="field"
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          multiple
          onChange={(event) => uploadVideos(event.target.files)}
        />
      </label>

      {(property.videos ?? []).length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(property.videos ?? []).map((video, index) => (
            <div className="relative" key={`${video}-${index}`}>
              <video
                src={video}
                controls
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                preload="metadata"
                className="h-48 w-full rounded-2xl bg-stone-900 object-cover"
              />
              <button
                className="danger-button absolute left-3 top-3 !min-h-10 !px-3"
                type="button"
                aria-label={`حذف الفيديو ${index + 1}`}
                onClick={() =>
                  update(
                    "videos",
                    (property.videos ?? []).filter((_, videoIndex) => videoIndex !== index),
                  )
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {uploadProgress.length > 0 ? (
        <div className="grid gap-2 rounded-2xl bg-linen p-4" aria-live="polite">
          {uploadProgress.map(({ id, progress }) => (
            <div className="flex items-center gap-3" key={id}>
              <Loader2 className="animate-spin text-berry" size={18} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                {progress.fileName}
              </span>
              <span className="text-xs font-black text-stone-500">{progress.percent}%</span>
            </div>
          ))}
        </div>
      ) : null}

      {mediaError ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800" role="alert">
          {mediaError}
        </p>
      ) : null}
    </div>
  );
}

function ReviewStep({
  property,
  primaryRentalPeriod,
}: {
  property: Property;
  primaryRentalPeriod: RentalPeriod;
}) {
  const googleMapsUrl = getGoogleMapsUrl(property, { canViewExact: true });
  const items = [
    ["اسم السكن", property.title],
    ["المدينة", property.city],
    ["الحي", property.neighborhood],
    ["المعلم", property.landmark || "غير مضاف"],
    ["التصنيف", selectedClassificationLabel(property.classification)],
    ["نوع السكن", selectedPropertyTypeLabel(property.propertyType)],
    [
      "عدد الوحدات المتاحة",
      (property.availableUnits ?? property.maxResidents).toLocaleString("ar-SA"),
    ],
    ["عدد الغرف", formatRooms(property)],
    ["الأسعار", formatRentalPrices(property)],
    [
      "السعر الظاهر في الصفحة الرئيسية",
      property.price > 0
        ? `${property.price.toLocaleString("ar-SA")} ريال / ${rentalPeriodLabels[primaryRentalPeriod]}`
        : "غير محدد",
    ],
    [
      "مميزات السكن",
      propertyFeatureOptions
        .filter(({ value }) => property.features?.includes(value))
        .map(({ label }) => label)
        .join("، ") || "غير محددة",
    ],
    [
      "المرافق القريبة",
      propertyFacilityOptions
        .filter(({ value }) => property.facilities?.includes(value))
        .map(({ label }) => label)
        .join("، ") || "غير محددة",
    ],
    [
      "الإيجار يشمل",
      rentIncludedOptions
        .filter(({ value }) => property.rentIncludes?.includes(value))
        .map(({ label }) => label)
        .join("، ") || "غير محدد",
    ],
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
        <p className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
          <span>رسوم نشر الإعلان:</span>
          <span className="text-stone-500 line-through decoration-2">300 ريال</span>
          <span>150 ريال بعد الخصم</span>
        </p>
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
