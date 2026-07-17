import { ChevronDown, Phone, UserCircle } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cityNames } from "@saknaha/constants/cities";
import logo from "../assets/saknaha-logo.png";

interface AppBarProps {
  onHome: () => void;
  onProfile: () => void;
  onLogout?: () => void;
  accountName?: string;
  onCities: () => void;
  onCity: (city: string) => void;
  onAbout: () => void;
  onFaq: () => void;
  onSupport: () => void;
}

export default function AppBar({
  onHome,
  onProfile,
  onLogout,
  accountName,
  onCities,
  onCity,
  onAbout,
  onFaq,
  onSupport,
}: AppBarProps) {
  const featuredCities = cityNames.slice(0, 12);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuCloseTimer = useRef<number | null>(null);

  function closeAccountMenu() {
    if (accountMenuCloseTimer.current) {
      window.clearTimeout(accountMenuCloseTimer.current);
    }
    accountMenuCloseTimer.current = window.setTimeout(() => {
      setAccountMenuOpen(false);
      accountMenuCloseTimer.current = null;
    }, 180);
  }

  function openAccountMenu() {
    if (accountMenuCloseTimer.current) {
      window.clearTimeout(accountMenuCloseTimer.current);
      accountMenuCloseTimer.current = null;
    }
    setAccountMenuOpen(true);
  }

  function handleAccountAction(action?: () => void) {
    if (accountMenuCloseTimer.current) {
      window.clearTimeout(accountMenuCloseTimer.current);
      accountMenuCloseTimer.current = null;
    }
    setAccountMenuOpen(false);
    action?.();
  }

  return (
    <header className="sticky top-0 z-[2000] border-b border-stone-200/70 bg-[#fbf7fc] shadow-sm">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-8">
        <button
          className="flex shrink-0 items-center rounded-xl transition hover:opacity-85"
          onClick={onHome}
          aria-label="العودة للرئيسية"
          type="button"
        >
          <img src={logo} alt="سكنها" className="h-12 w-28 object-contain object-right md:w-36" />
        </button>

        <nav className="hidden items-center gap-1 text-sm font-black text-stone-600 lg:flex">
          <NavButton onClick={onHome}>الرئيسية</NavButton>

          <Dropdown label="المدن">
            <div className="grid min-w-72 grid-cols-2 gap-1">
              {featuredCities.map((city) => (
                <button
                  key={city}
                  className="rounded-lg px-3 py-2 text-right text-sm font-bold text-stone-600 transition hover:bg-linen hover:text-berry"
                  onClick={() => onCity(city)}
                  type="button"
                >
                  {city}
                </button>
              ))}
            </div>
            <button
              className="mt-2 w-full rounded-lg border-t border-stone-100 px-3 py-2 text-right text-sm font-black text-berry transition hover:bg-linen"
              onClick={onCities}
              type="button"
            >
              تصفح كل المدن
            </button>
          </Dropdown>

          <Dropdown label="من نحن">
            <DropdownButton
              onClick={onAbout}
              title="عن سكنها"
              description="تعرفي على المنصة وما نبنيه للسكن النسائي في السعودية."
            />
            <DropdownButton
              onClick={onSupport}
              title="تواصلي مع الدعم"
              description="قنوات المساعدة وخيارات الدعم."
            />
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-linen px-3 py-2 text-sm font-black text-ink">
              <span className="inline-flex items-center gap-2">
                <Phone size={16} aria-hidden="true" />
                رقم التواصل
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-berry">قريباً</span>
            </div>
          </Dropdown>

          <NavButton onClick={onFaq}>الأسئلة الشائعة</NavButton>
          {!accountName ? <NavButton onClick={onProfile}>تسجيل الدخول</NavButton> : null}
        </nav>

        {accountName ? (
          <div className="relative" onMouseEnter={openAccountMenu} onMouseLeave={closeAccountMenu}>
            <button
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-berry shadow-sm transition hover:border-berry hover:bg-linen"
              aria-label={`فتح قائمة حساب ${accountName}`}
              title="حسابي"
              onClick={() => setAccountMenuOpen((open) => !open)}
              type="button"
            >
              <span className="hidden max-w-32 truncate text-sm font-black text-ink sm:inline">
                {accountName}
              </span>
              <UserCircle size={24} aria-hidden="true" />
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <div
              className={`absolute left-0 top-full z-[2300] mt-2 w-48 rounded-2xl border border-stone-200 bg-white p-2 text-right shadow-2xl ring-1 ring-black/5 transition ${
                accountMenuOpen
                  ? "visible translate-y-0 opacity-100"
                  : "invisible translate-y-2 opacity-0"
              }`}
            >
              <button
                className="block w-full rounded-xl px-3 py-2 text-right text-sm font-black text-ink transition hover:bg-linen"
                onClick={() => handleAccountAction(onProfile)}
                type="button"
              >
                لوحة التحكم
              </button>
              <button
                className="block w-full rounded-xl px-3 py-2 text-right text-sm font-black text-rose-600 transition hover:bg-rose-50"
                onClick={() => handleAccountAction(onLogout)}
                type="button"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        ) : (
          <button
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-berry shadow-sm transition hover:border-berry hover:bg-linen"
            onClick={onProfile}
            aria-label="فتح الحساب وتسجيل الدخول"
            title="الحساب"
            type="button"
          >
            <UserCircle size={24} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 pb-2 text-xs font-black text-stone-600 sm:grid-cols-6 md:px-8 lg:hidden">
        <MobileButton onClick={onHome}>الرئيسية</MobileButton>
        <MobileButton onClick={onCities}>المدن</MobileButton>
        <MobileButton onClick={onProfile}>{accountName ? "لوحتي" : "الحساب"}</MobileButton>
        <MobileButton onClick={onAbout}>من نحن</MobileButton>
        <MobileButton onClick={onFaq}>الأسئلة</MobileButton>
        <MobileButton onClick={onProfile}>
          {accountName ? accountName : "تسجيل الدخول"}
        </MobileButton>
      </nav>
    </header>
  );
}

function NavButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      className="rounded-xl px-3 py-2 transition hover:bg-linen hover:text-ink"
      onClick={onClick}
      type="button"
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
      type="button"
    >
      {children}
    </button>
  );
}

function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group relative">
      <button
        className="inline-flex items-center gap-1 rounded-xl px-3 py-2 transition hover:bg-linen hover:text-ink"
        type="button"
      >
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
      type="button"
    >
      <span className="block text-sm font-black text-ink">{title}</span>
      <span className="mt-1 block text-xs font-bold leading-5 text-stone-500">{description}</span>
    </button>
  );
}
