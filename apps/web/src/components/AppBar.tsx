import { ChevronDown, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { cityNames } from "@saknaha/constants/cities";
import logo from "../assets/saknaha-logo.png";

interface AppBarProps {
  onHome: () => void;
  onOwner: () => void;
  onUser: () => void;
  onCities: () => void;
  onCity: (city: string) => void;
  onRoommates: () => void;
  onAbout: () => void;
  onFaq: () => void;
  onSupport: () => void;
}

export default function AppBar({
  onHome,
  onOwner,
  onUser,
  onCities,
  onCity,
  onRoommates,
  onAbout,
  onFaq,
  onSupport,
}: AppBarProps) {
  const featuredCities = cityNames.slice(0, 12);

  return (
    <header className="sticky top-0 z-[2000] border-b border-stone-200/70 bg-[#fbf7fc] shadow-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-8">
        <button
          className="flex shrink-0 items-center rounded-xl transition hover:opacity-85"
          onClick={onHome}
          aria-label="العودة للرئيسية"
        >
          <img src={logo} alt="سكنها" className="h-12 w-28 object-contain object-right md:w-36" />
        </button>

        <nav className="hidden items-center gap-1 text-sm font-black text-stone-600 lg:flex">
          <NavButton onClick={onHome}>الرئيسية</NavButton>
          <NavButton onClick={onRoommates}>الباحثات عن شريكة سكن</NavButton>

          <Dropdown label="المستفيدين">
            <DropdownButton
              onClick={onUser}
              title="باحثة عن سكن"
              description="استكشاف السكن حسب المدينة والموقع."
            />
            <DropdownButton
              onClick={onRoommates}
              title="باحثة عن شريكة سكن"
              description="وحدات سكنية تبحث ساكناتها عن شريكات."
            />
            <DropdownButton
              onClick={onOwner}
              title="صاحب سكن"
              description="إضافة وحدة سكنية وإدارتها من لوحة واحدة."
            />
            <DropdownButton
              onClick={onSupport}
              title="مزود خدمات"
              description="قريبًا للنقل والتنظيف والصيانة."
            />
          </Dropdown>

          <Dropdown label="المدن">
            <div className="grid min-w-72 grid-cols-2 gap-1">
              {featuredCities.map((city) => (
                <button
                  key={city}
                  className="rounded-lg px-3 py-2 text-right text-sm font-bold text-stone-600 transition hover:bg-linen hover:text-berry"
                  onClick={() => onCity(city)}
                >
                  {city}
                </button>
              ))}
            </div>
            <button
              className="mt-2 w-full rounded-lg border-t border-stone-100 px-3 py-2 text-right text-sm font-black text-berry transition hover:bg-linen"
              onClick={onCities}
            >
              تصفح كل المدن
            </button>
          </Dropdown>

          <Dropdown label="من نحن">
            <DropdownButton
              onClick={onAbout}
              title="عن سكنها"
              description="فكرة المنصة والهدف من النسخة التجريبية."
            />
            <DropdownButton
              onClick={onSupport}
              title="تواصل معنا"
              description="قنوات الدعم المباشر قريبًا."
            />
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-linen px-3 py-2 text-sm font-black text-ink">
              <span className="inline-flex items-center gap-2">
                <Phone size={16} aria-hidden="true" />
                رقم التواصل
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-berry">قريبًا</span>
            </div>
          </Dropdown>

          <NavButton onClick={onFaq}>الأسئلة الشائعة</NavButton>
        </nav>

        <button
          className="secondary-button !min-h-10 shrink-0 !px-3 !py-2 !text-sm"
          onClick={onOwner}
        >
          أعرض سكني
        </button>
      </div>

      <nav className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 pb-2 text-xs font-black text-stone-600 sm:grid-cols-7 md:px-8 lg:hidden">
        <MobileButton onClick={onHome}>الرئيسية</MobileButton>
        <MobileButton onClick={onUser}>باحثة</MobileButton>
        <MobileButton onClick={onRoommates}>شريكة سكن</MobileButton>
        <MobileButton onClick={onOwner}>صاحب سكن</MobileButton>
        <MobileButton onClick={onCities}>المدن</MobileButton>
        <MobileButton onClick={onAbout}>من نحن</MobileButton>
        <MobileButton onClick={onFaq}>الأسئلة الشائعة</MobileButton>
      </nav>
    </header>
  );
}

function NavButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      className="rounded-xl px-3 py-2 transition hover:bg-linen hover:text-ink"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MobileButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      className="min-h-9 rounded-full border border-stone-200 bg-white/80 px-2 py-1.5 transition hover:border-berry hover:text-berry"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group relative">
      <button className="inline-flex items-center gap-1 rounded-xl px-3 py-2 transition hover:bg-linen hover:text-ink">
        {label}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="invisible absolute right-0 top-full z-[2200] w-max min-w-64 translate-y-2 rounded-2xl border border-stone-200 bg-white p-3 text-right opacity-0 shadow-2xl ring-1 ring-black/5 transition group-hover:visible group-hover:translate-y-1 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-1 group-focus-within:opacity-100">
        {children}
      </div>
    </div>
  );
}

function DropdownButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="block w-full rounded-xl px-3 py-2 text-right transition hover:bg-linen"
      onClick={onClick}
    >
      <span className="block text-sm font-black text-ink">{title}</span>
      <span className="mt-1 block text-xs font-bold leading-5 text-stone-500">{description}</span>
    </button>
  );
}
