import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isValidCoordinates, type Coordinates } from "@saknaha/utils/directions";

interface PropertyLocationPickerProps {
  value: Coordinates | null;
  onChange(value: Coordinates): void;
}

const defaultCenter: L.LatLngExpression = [24.7136, 46.6753];

export default function PropertyLocationPicker({ value, onChange }: PropertyLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialValue = initialValueRef.current;
    const map = L.map(containerRef.current, {
      center:
        initialValue && isValidCoordinates(initialValue)
          ? [initialValue.lat, initialValue.lng]
          : defaultCenter,
      zoom: initialValue && isValidCoordinates(initialValue) ? 15 : 5,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      const next = { lat: event.latlng.lat, lng: event.latlng.lng };
      onChangeRef.current(next);
    });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value || !isValidCoordinates(value)) return;
    if (!markerRef.current) {
      const marker = L.marker([value.lat, value.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        onChangeRef.current({ lat: point.lat, lng: point.lng });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
    map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15));
  }, [value]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
        setMessage("تم تحديد الموقع الحالي والتحقق من الإحداثيات.");
      },
      () => {
        setLocating(false);
        setMessage("تعذر الوصول إلى الموقع. تحققي من إذن الموقع ثم حاولي مجددًا.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="grid gap-3 md:col-span-2 xl:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="label">تحديد الموقع على الخريطة *</span>
          <p className="text-xs font-bold text-stone-500">
            انقري على الخريطة أو اسحبي العلامة لتعديل الموقع.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          <Crosshair size={18} aria-hidden="true" />
          {locating ? "جاري تحديد الموقع..." : "استخدام موقعي الحالي"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-2xl border border-sky-100 md:h-80"
        role="application"
        aria-label="خريطة تفاعلية لتحديد موقع السكن"
      />
      {value && isValidCoordinates(value) ? (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-black text-mintdeep">
          <MapPin size={17} aria-hidden="true" />
          تم التحقق من الإحداثيات: {value.lat.toFixed(6)}، {value.lng.toFixed(6)}
        </p>
      ) : (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-black text-amber-800">
          الموقع مطلوب قبل إرسال الإعلان للمراجعة.
        </p>
      )}
      {message ? <p className="text-sm font-bold text-stone-600">{message}</p> : null}
    </div>
  );
}
