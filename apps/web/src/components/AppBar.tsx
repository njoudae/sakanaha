import { ChevronDown, Phone, UserCircle } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import logo from "../assets/saknaha-logo.webp";

interface AppBarProps {
  onHome: () => void;
  onProfile: () => void;
  onOwner: () => void;
  onHousing: () => void;
  onRoommates: () => void;
  onLogout?: () => void;
  accountName?: string;
  onAbout: () => void;
  onFaq: () => void;
  onSupport: () => void;
}

export default function AppBar({
  onHome,
  onProfile,
  onOwner,
  onHousing,
  onRoommates,
  onLogout,
  accountName,
  onAbout,
  onFaq,
  onSupport,
}: AppBarProps) {
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
          <img
            src={logo}
            alt="سكنها"
            width="320"
            height="264"
            fetchPriority="high"
            className="h-12 w-28 object-contain object-right md:w-36"
          />
        </button>

        <nav className="hidden items-center gap-1 text-sm font-black text-stone-600 lg:flex">
          <NavButton onClick={onHome}>الرئيسية</NavButton>

          <Dropdown label="المستفيدون">
            <DropdownButton
              onClick={onOwner}
              title="مالك عقار"
              description="الدخول إلى لوحة المالك وإدارة الإعلانات."
            />
            <DropdownButton
              onClick={onHousing}
              title="باحثة عن سكن"
              description="عرض الصفحة الشاملة لجميع خيارات السكن."
            />
            <DropdownButton
              onClick={onRoommates}
              title="شريكة سكن"
              description="عرض بطاقات الباحثات عن شريكات سكن."
            />
          </Dropdown>

          <Dropdown label="من نحن">
            <DropdownButton
              onClick={onAbout}
              title="عن سكنها"
              description="تعرفي على المنصة وما نبنيه للسكن النسائي في السعودية."
            />
            <DropdownButton
              onClick={onFaq}
              title="الأسئلة الشائعة"
              description="إجابات خطوات الاستخدام والرسوم."
            />
            <DropdownButton
              onClick={onSupport}
              title="الدعم"
              description="قنوات المساعدة وخيارات الدعم."
            />
            <button
              className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl bg-linen px-3 py-2 text-sm font-black text-ink transition hover:bg-stone-100"
              onClick={onSupport}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Phone size={16} aria-hidden="true" />
                تواصل
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-berry">الدعم</span>
            </button>
          </Dropdown>
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
            <span className="hidden text-sm font-extrabold text-ink sm:inline">تسجيل الدخول</span>
          </button>
        )}
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-center gap-1 px-4 pb-2 text-xs font-black text-stone-600 md:px-8 lg:hidden">
        <NavButton onClick={onHome}>الرئيسية</NavButton>
        <Dropdown label="المستفيدون">
          <DropdownButton
            onClick={onOwner}
            title="مالك عقار"
            description="الدخول إلى لوحة المالك وإدارة الإعلانات."
          />
          <DropdownButton
            onClick={onHousing}
            title="باحثة عن سكن"
            description="عرض الصفحة الشاملة لجميع خيارات السكن."
          />
          <DropdownButton
            onClick={onRoommates}
            title="شريكة سكن"
            description="عرض بطاقات الباحثات عن شريكات سكن."
          />
        </Dropdown>
        <Dropdown label="من نحن">
          <DropdownButton
            onClick={onAbout}
            title="عن سكنها"
            description="تعرفي على المنصة وما نبنيه للسكن النسائي في السعودية."
          />
          <DropdownButton
            onClick={onFaq}
            title="الأسئلة الشائعة"
            description="إجابات خطوات الاستخدام والرسوم."
          />
          <DropdownButton
            onClick={onSupport}
            title="الدعم والتواصل"
            description="قنوات المساعدة وخيارات الدعم."
          />
        </Dropdown>
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
