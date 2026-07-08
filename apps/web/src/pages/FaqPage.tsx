import { Plus } from "lucide-react";
import { useState } from "react";

const faqItems = [
  {
    question: "ما هي منصة سكنها؟",
    answer:
      "سكنها منصة تساعد الطالبات والموظفات على البحث عن سكن مناسب بالقرب من الجامعة أو مقر العمل، وتساعد أصحاب الوحدات على عرض السكن بطريقة واضحة.",
  },
  {
    question: "هل يمكن لصاحب السكن إضافة أكثر من وحدة؟",
    answer: "نعم، يمكن لصاحب السكن إضافة أكثر من وحدة وإدارة بيانات كل وحدة من لوحة التحكم.",
  },
  {
    question: "هل الحجز والدفع متاحان الآن؟",
    answer: "حالياً النسخة تجريبية، وتتوفر خاصية تسجيل الاهتمام. سيتم دعم الحجز والدفع لاحقاً.",
  },
  {
    question: "هل يمكن البحث حسب المدينة؟",
    answer: "نعم، يمكنك اختيار المدينة لعرض الوحدات المتوفرة فيها.",
  },
  {
    question: "هل يوجد ربط مع منصة إيجار؟",
    answer: "الربط مع منصة إيجار ضمن الخطة المستقبلية.",
  },
  {
    question: "هل مزودو الخدمات متاحون؟",
    answer: "مزودو الخدمات مثل النقل والتنظيف والصيانة سيتم دعمهم في الإصدارات القادمة.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-7 text-center">
        <p className="text-sm font-black text-berry">مركز المساعدة</p>
        <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">أسئلة وأجوبة</h1>
      </header>

      <div className="space-y-3">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <article
              key={item.question}
              className="rounded-2xl border border-white/80 bg-white/90 shadow-sm"
            >
              <button
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-right font-black text-ink md:px-5"
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <Plus
                  size={20}
                  className={`shrink-0 text-berry transition ${isOpen ? "rotate-45" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <div
                className={`grid transition-all duration-200 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
              >
                <div className="overflow-hidden">
                  <p className="border-t border-stone-100 px-4 py-4 text-sm font-bold leading-8 text-stone-600 md:px-5">
                    {item.answer}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
