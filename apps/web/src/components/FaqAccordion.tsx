import { Plus } from "lucide-react";
import { useState } from "react";
import { faqItems } from "../content/faqItems";

export default function FaqAccordion({ initiallyOpen = 0 }: { initiallyOpen?: number }) {
  const [openIndex, setOpenIndex] = useState(initiallyOpen);

  return (
    <div className="space-y-3">
      {faqItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={item.question}
            className="rounded-xl border border-white/80 bg-white/90 shadow-sm"
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-right text-sm font-black text-ink md:px-5 md:text-base"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              type="button"
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
  );
}
