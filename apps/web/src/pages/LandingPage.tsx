import { Building2, GraduationCap, Home, Store, UserRoundSearch, WalletCards } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CityQuickNav from "../components/CityQuickNav";
import HomeMap from "../components/HomeMap";
import RoleCard from "../components/RoleCard";

interface LandingPageProps {
  onOwner: () => void;
  onUser: () => void;
  onCity: (city: string) => void;
  onRoommates: () => void;
}

export default function LandingPage({ onOwner, onUser, onCity, onRoommates }: LandingPageProps) {
  return (
    <main className="overflow-x-hidden">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-8 pt-8 md:px-8 md:pb-12 md:pt-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div className="order-2 text-right lg:order-1">
          <h1 className="text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-5xl">
            اعرض عقارك أو اعثري على سكن قريب من جامعتك أو مقر عملك
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 md:text-lg">
            منصة تساعد الباحثات عن السكن وملاك العقارات على الوصول لبعضهم بطريقة أوضح وأسهل.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap">
            <button className="primary-button" onClick={onUser}>
              ابحثي عن سكن
            </button>
            <button className="secondary-button" onClick={onOwner}>
              أضف عقارك
            </button>
            <button className="secondary-button" onClick={onRoommates}>
              ابحثي عن شريكة سكن
            </button>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <HomeMap />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 md:px-8 md:pb-12">
        <div className="grid min-w-0 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
          <RoleCard
            title="صاحب سكن"
            description="أضف وحدتك، حدّث بياناتها، وتابع طلبات التواصل من لوحة واحدة."
            icon={Building2}
            onClick={onOwner}
          />
          <RoleCard
            title="باحثة عن سكن"
            description="ابحثي عن السكن المناسب حسب الموقع والميزانية وجهة الدراسة أو العمل."
            icon={UserRoundSearch}
            onClick={onUser}
          />
          <RoleCard
            title="مزود خدمات"
            description="خدمات النقل والتنظيف والصيانة وغيرها ستكون متاحة في الإصدارات القادمة."
            icon={Store}
            badge="قريبًا"
            disabled
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-8 md:pb-14">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black text-berry">شريكة سكن</p>
              <h2 className="mt-2 text-2xl font-black text-ink md:text-3xl">
                ابحثي عن شريكة سكن مناسبة
              </h2>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-stone-600 md:text-base">
                حددي جامعتك أو مقر عملك وميزانيتك وسنساعدك في العثور على باحثات عن سكن بنفس
                الاحتياج.
              </p>
            </div>
            <button className="primary-button w-full sm:w-auto" onClick={onRoommates}>
              ابدئي البحث
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <RoommateBenefit
              icon={GraduationCap}
              title="نفس الجامعة"
              description="مطابقة حسب الجامعة أو الفرع."
            />
            <RoommateBenefit
              icon={WalletCards}
              title="ميزانية متقاربة"
              description="العثور على باحثات بميزانية مشابهة."
            />
            <RoommateBenefit
              icon={Home}
              title="نفس السكن"
              description="الانضمام إلى نفس الوحدة السكنية عند اكتمال العدد."
            />
          </div>
        </div>
      </section>

      <CityQuickNav onCity={onCity} />
    </main>
  );
}

function RoommateBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl bg-linen p-4">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-berry"
        aria-hidden="true"
      >
        <Icon size={24} />
      </span>
      <h3 className="mt-3 text-lg font-black text-ink">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-7 text-stone-600">{description}</p>
    </article>
  );
}
