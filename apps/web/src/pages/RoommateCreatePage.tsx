import { ArrowRight, Crosshair, Link2, MapPinned } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { cityNames } from "@saknaha/constants/cities";
import type {
  Property,
  PropertyType,
  RoommateCardSource,
  RoommateLifestylePreferences,
  UniversityLocation,
  User,
} from "@saknaha/shared-types";
import PropertyLocationPicker from "../components/PropertyLocationPicker";
import RoommatePreferencesFields from "../components/RoommatePreferencesFields";
import UniversityReferenceSelector from "../components/UniversityReferenceSelector";
import { useAuthService } from "../auth";
import { useMapsData } from "../data/MapsDataContext";
import { addRoommateRequest, getUserActivity, saveProperty } from "../services/propertyService";
import { defaultRoommatePreferences } from "../services/roommatePreferenceDefaults";

interface RoommateCreatePageProps {
  user: User;
  initialCity?: string;
  onBack: () => void;
  onDone: () => void;
}

type LocationMethod = "current" | "link" | "map";

export default function RoommateCreatePage({
  user,
  initialCity,
  onBack,
  onDone,
}: RoommateCreatePageProps) {
  const authService = useAuthService();
  const mapsData = useMapsData();
  const eligibleProperties = useMemo(() => {
    const seen = new Set<string>();
    return getUserActivity(user.id)
      .interests.map((item) => item.property)
      .filter((property): property is Property => {
        if (!property || seen.has(property.id)) return false;
        seen.add(property.id);
        return true;
      });
  }, [user.id]);
  const [source, setSource] = useState<RoommateCardSource | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [city, setCity] = useState(initialCity || user.city || "أبها");
  const [neighborhood, setNeighborhood] = useState("");
  const [landmark, setLandmark] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("شقة");
  const [availableRooms, setAvailableRooms] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityLocation | null>(
    authService.selectedUniversityBranch,
  );
  const [bio, setBio] = useState("");
  const [preferences, setPreferences] = useState<RoommateLifestylePreferences>(
    user.roommatePreferences ?? defaultRoommatePreferences,
  );
  const [locationMethod, setLocationMethod] = useState<LocationMethod | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [locationMessage, setLocationMessage] = useState("");

  const selectedProperty = eligibleProperties.find(
    (property) => property.id === selectedPropertyId,
  );
  const listedPrice = selectedProperty
    ? Math.ceil(selectedProperty.price / Math.max(1, selectedProperty.maxResidents))
    : 0;

  async function resolveMapsLink() {
    if (!googleMapsUrl.trim()) return;
    setLocationMessage("جاري التحقق من الرابط...");
    const result = await mapsData.resolveLocationLink(googleMapsUrl);
    if (!result.ok) {
      setLocationMessage("تعذر قراءة الموقع من الرابط. تأكدي من رابط Google Maps.");
      return;
    }
    setGoogleMapsUrl(result.normalizedUrl);
    setLat(result.coordinates.lat);
    setLng(result.coordinates.lng);
    setLocationMessage("تم التحقق من الموقع.");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }
    setLocationMessage("جاري تحديد الموقع...");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLat(coords.latitude);
        setLng(coords.longitude);
        setLocationMessage("تم تحديد الموقع الحالي.");
      },
      () => setLocationMessage("تعذر الوصول إلى الموقع. تحققي من إذن الموقع."),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!source) return;

    if (source === "saknaha_property" && !selectedProperty) {
      window.alert("اختاري السكن المرتبط بالبطاقة أولاً.");
      return;
    }

    const rooms = Math.max(1, Number(availableRooms) || 1);
    const externalPricePerPerson = Math.max(0, Number(pricePerPerson) || 0);
    const linkedProperty =
      selectedProperty ??
      saveProperty({
        id: "",
        ownerId: user.id,
        ownerName: user.name,
        ownerPhone: user.phone,
        title: `سكن خارجي في ${city}`,
        propertyLicenseNumber: "سكن خارجي",
        region: "",
        city,
        neighborhood: neighborhood.trim() || "غير محدد",
        district: neighborhood.trim() || "غير محدد",
        landmark: landmark.trim(),
        address: neighborhood.trim() || city,
        universityNearby:
          selectedUniversity?.label ?? selectedUniversity?.universityName ?? "غير محدد",
        googleMapsUrl,
        lat,
        lng,
        locationVisibility: "approximate",
        classification: "متاح للجميع",
        propertyType,
        minRooms: rooms,
        maxRooms: rooms,
        floorsCount: 1,
        hasElevator: false,
        hasCleaningWorker: false,
        features: [],
        facilities: [],
        rentIncludes: [],
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 1,
        furnished: true,
        maxResidents: rooms,
        totalUnits: rooms,
        availableUnits: rooms,
        availabilityStatus: "available",
        roommateAllowed: true,
        requiresLeaseContract: true,
        price: externalPricePerPerson * rooms,
        paymentType: "شهري",
        rentalPrices: { monthly: externalPricePerPerson * rooms },
        negotiable: false,
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
      });

    const submittedAt = new Date().toISOString();
    const card = addRoommateRequest({
      propertyId: linkedProperty.id,
      userId: user.id,
      requesterName: user.name,
      userType: user.role,
      age: 18,
      organization: selectedUniversity?.label ?? selectedUniversity?.universityName ?? "غير محدد",
      moveInDate: "مرن",
      bio: bio.trim(),
      availableRooms: rooms,
      source,
      pricePerPerson: source === "saknaha_property" ? listedPrice : externalPricePerPerson,
      preferences,
      region: linkedProperty.region,
      city: linkedProperty.city,
      district: linkedProperty.neighborhood,
      landmark: linkedProperty.landmark,
      universityBranchId: selectedUniversity?.id,
      approximateLat: linkedProperty.lat,
      approximateLng: linkedProperty.lng,
      publicationStatus: "pending_review",
      submittedAt,
    });

    window.alert(
      card.publicationStatus === "approved"
        ? "تمت الموافقة على البطاقة ونشرها مباشرة. ستظهر الآن في الصفحة الرئيسية."
        : "اكتملت معاينة دفع 15 ريال وتم إرسال البطاقة للمراجعة.",
    );
    onDone();
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>
      <form
        className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 text-right shadow-sm md:p-6"
        onSubmit={submit}
      >
        <div>
          <p className="text-sm font-black text-berry">إنشاء بطاقة شريكة سكن</p>
          <h1 className="mt-1 text-2xl font-black text-ink">أين يقع السكن؟</h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SourceButton
            active={source === "saknaha_property"}
            title="سكن مدرج في سكنها"
            description="اختاريه من اهتماماتك أو حجوزاتك."
            onClick={() => setSource("saknaha_property")}
          />
          <SourceButton
            active={source === "external_property"}
            title="سكن غير مدرج في سكنها"
            description="أدخلي بياناته وموقعه يدوياً."
            onClick={() => setSource("external_property")}
          />
        </div>

        {source === "saknaha_property" ? (
          <div className="grid gap-4">
            <label>
              <span className="label">اختاري السكن</span>
              <select
                className="field field-select"
                value={selectedPropertyId}
                onChange={(event) => setSelectedPropertyId(event.target.value)}
              >
                <option value="">اختاري من العقارات المهتمة بها</option>
                {eligibleProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.city}، {property.neighborhood} — {property.title}
                  </option>
                ))}
              </select>
            </label>
            {eligibleProperties.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">
                لا توجد عقارات في اهتماماتك بعد. افتحي صفحة العقار وسجلي اهتمامك أولاً.
              </p>
            ) : null}
            {selectedProperty ? (
              <div className="grid gap-2 rounded-xl bg-linen p-4 sm:grid-cols-2">
                <Info
                  label="المدينة والحي"
                  value={`${selectedProperty.city}، ${selectedProperty.neighborhood}`}
                />
                <Info label="نوع العقار" value={selectedProperty.propertyType} />
                <Info label="السعر لكل شخص" value={`${listedPrice.toLocaleString("ar-SA")} ريال`} />
                <Info label="المعلم" value={selectedProperty.landmark || "غير مضاف"} />
              </div>
            ) : null}
          </div>
        ) : null}

        {source === "external_property" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">المدينة</span>
                <select
                  className="field field-select"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                >
                  {cityNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="الحي" value={neighborhood} onChange={setNeighborhood} />
              <TextField
                label="معلم قريب"
                value={landmark}
                onChange={setLandmark}
                placeholder="مثال: جامعة الملك خالد - مجمع قريقر"
              />
              <label>
                <span className="label">نوع العقار</span>
                <select
                  className="field field-select"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                >
                  {["شقة", "دور", "غرفة", "عمارة", "سكن مشترك"].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <LocationMethods
              method={locationMethod}
              onMethod={setLocationMethod}
              url={googleMapsUrl}
              onUrl={setGoogleMapsUrl}
              onResolve={() => void resolveMapsLink()}
              onCurrent={useCurrentLocation}
              coordinates={lat !== undefined && lng !== undefined ? { lat, lng } : null}
              onCoordinates={(coordinates) => {
                setLat(coordinates.lat);
                setLng(coordinates.lng);
              }}
              message={locationMessage}
            />
          </div>
        ) : null}

        {source ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="عدد الأماكن المتبقية"
                value={availableRooms}
                onChange={(value) => setAvailableRooms(value.replace(/\D/g, ""))}
                placeholder="مثال: 2"
              />
              {source === "external_property" ? (
                <TextField
                  label="السعر لكل شخص"
                  value={pricePerPerson}
                  onChange={(value) => setPricePerPerson(value.replace(/\D/g, ""))}
                  placeholder="مثال: 1200"
                />
              ) : null}
            </div>
            <UniversityReferenceSelector
              selectedUniversity={selectedUniversity}
              onChange={setSelectedUniversity}
              city={source === "saknaha_property" ? selectedProperty?.city : city}
            />
            <RoommatePreferencesFields value={preferences} onChange={setPreferences} />
            <label>
              <span className="label">وصف مختصر</span>
              <textarea
                className="field min-h-24"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="اكتبي نبذة واضحة عن السكن وما تبحثين عنه في شريكة السكن."
              />
            </label>
            <p className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
              <span>رسوم نشر بطاقة شريكة السكن:</span>
              <span className="text-stone-500 line-through decoration-2">30 ريال</span>
              <span>بعد الخصم 15 ريال</span>
            </p>
            <button className="primary-button w-full">دفع وتأكيد البطاقة</button>
            <p className="text-center text-sm font-black leading-6 text-black">
              عند إتمام الدفع سيتم نشر البطاقة بالصفحة الرئيسية وسوف تصلك طلبات المشاركة على رقم
              الواتساب.
            </p>
          </>
        ) : null}
      </form>
    </main>
  );
}

function SourceButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-xl border p-4 text-right transition ${active ? "border-berry bg-fuchsia-50" : "border-stone-200 bg-white hover:border-berry"}`}
      onClick={onClick}
      type="button"
    >
      <span className="block font-black text-ink">{title}</span>
      <span className="mt-1 block text-xs font-bold text-stone-500">{description}</span>
    </button>
  );
}

function LocationMethods({
  method,
  onMethod,
  url,
  onUrl,
  onResolve,
  onCurrent,
  coordinates,
  onCoordinates,
  message,
}: {
  method: LocationMethod | null;
  onMethod: (method: LocationMethod) => void;
  url: string;
  onUrl: (value: string) => void;
  onResolve: () => void;
  onCurrent: () => void;
  coordinates: { lat: number; lng: number } | null;
  onCoordinates: (value: { lat: number; lng: number }) => void;
  message: string;
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border border-stone-200 bg-linen p-4">
      <legend className="px-2 text-sm font-black text-ink">اختاري طريقة تحديد الموقع</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        <MethodButton
          active={method === "current"}
          icon={Crosshair}
          label="الموقع الحالي"
          onClick={() => onMethod("current")}
        />
        <MethodButton
          active={method === "link"}
          icon={Link2}
          label="رابط Google Maps"
          onClick={() => onMethod("link")}
        />
        <MethodButton
          active={method === "map"}
          icon={MapPinned}
          label="تحديد على الخريطة"
          onClick={() => onMethod("map")}
        />
      </div>
      {method === "current" ? (
        <button className="secondary-button" type="button" onClick={onCurrent}>
          تحديد موقعي الآن
        </button>
      ) : null}
      {method === "link" ? (
        <label>
          <span className="label">رابط Google Maps</span>
          <input
            className="field"
            dir="ltr"
            value={url}
            onChange={(event) => onUrl(event.target.value)}
            onBlur={onResolve}
            placeholder="https://maps.google.com/..."
          />
        </label>
      ) : null}
      {method === "map" ? (
        <PropertyLocationPicker value={coordinates} onChange={onCoordinates} />
      ) : null}
      {message ? <p className="text-sm font-bold text-stone-600">{message}</p> : null}
    </fieldset>
  );
}

function MethodButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Crosshair;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? "primary-button" : "secondary-button"}
      onClick={onClick}
      type="button"
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}
