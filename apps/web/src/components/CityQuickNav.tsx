import { cityNames } from "@saknaha/constants/cities";

interface CityQuickNavProps {
  onCity: (city: string) => void;
}

export default function CityQuickNav({ onCity }: CityQuickNavProps) {
  return (
    <section id="cities" className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-8 md:pb-14">
      <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-6 shadow-sm backdrop-blur md:px-7">
        <div className="mb-4 text-center md:text-right">
          <h2 className="text-2xl font-black text-ink">تصفحي السكن حسب المدينة</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            اختاري المدينة لعرض الوحدات المتوفرة فيها.
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-y-3 text-sm font-black text-stone-600 md:justify-start md:text-base">
          {cityNames.map((city, index) => (
            <span key={city} className="inline-flex items-center">
              <button
                className="rounded-lg px-2 py-1 transition hover:bg-fuchsia-50 hover:text-berry focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-skysoft/40"
                onClick={() => onCity(city)}
              >
                {city}
              </button>
              {index < cityNames.length - 1 ? (
                <span className="mx-1 h-4 w-px bg-teal-200/80" aria-hidden="true" />
              ) : null}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}
