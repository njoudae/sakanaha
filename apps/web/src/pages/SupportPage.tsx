const supportCards = ["تواصل معنا", "الإبلاغ عن مشكلة", "مركز المساعدة"];

export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7 text-center">
        <p className="text-sm font-black text-berry">سكنها</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">الدعم والمساعدة</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-8 text-stone-600 md:text-base">
          فريق سكنها يعمل على توفير قنوات دعم مباشرة قريباً.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {supportCards.map((title) => (
          <article key={title} className="panel text-center">
            <h2 className="text-xl font-black text-ink">{title}</h2>
            <p className="mt-3 inline-flex rounded-full bg-fuchsia-50 px-4 py-2 text-sm font-black text-berry">
              قريبًا
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
