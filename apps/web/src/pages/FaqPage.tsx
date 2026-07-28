import FaqAccordion from "../components/FaqAccordion";

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7 text-center">
        <p className="text-sm font-black text-berry">مركز المساعدة</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">أسئلة وأجوبة</h1>
      </header>

      <FaqAccordion />
    </main>
  );
}
