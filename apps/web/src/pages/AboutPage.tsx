import { Building2, Phone, UserRoundSearch } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7 text-center">
        <p className="text-sm font-black text-berry">من نحن</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
          سكنها تربط الباحثات عن السكن بأصحاب السكن
        </h1>
        <p className="mx-auto mt-3 max-w-3xl text-sm font-bold leading-8 text-stone-600 md:text-base">
          سكنها منصة تجريبية تساعد الباحثات على استكشاف خيارات السكن بشكل أوضح، وتساعد أصحاب السكن
          على عرض وحداتهم وإدارتها بخطوات بسيطة.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel">
          <UserRoundSearch className="text-berry" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black text-ink">للباحثات عن سكن</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            تصفح الوحدات حسب المدينة والموقع والميزانية، مع بيانات واضحة تساعد على المقارنة.
          </p>
        </article>

        <article className="panel">
          <Building2 className="text-berry" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black text-ink">لأصحاب السكن</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            إضافة الوحدات ومراجعة بياناتها ومعاينة طريقة ظهورها للباحثات قبل الاعتماد.
          </p>
        </article>

        <article className="panel">
          <Phone className="text-berry" size={28} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-black text-ink">رقم التواصل</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            قنوات التواصل المباشر سيتم تفعيلها قريبًا ضمن النسخة القادمة.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-fuchsia-50 px-4 py-2 text-sm font-black text-berry">
            قريبًا
          </span>
        </article>
      </section>
    </main>
  );
}
