import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

interface DiscoveryCarouselProps<T> {
  title: string;
  subtitle?: string;
  items: T[];
  onTitleClick: () => void;
  renderItem: (item: T) => ReactNode;
  emptyText?: string;
  itemClassName?: string;
  railClassName?: string;
}

export default function DiscoveryCarousel<T>({
  title,
  subtitle,
  items,
  onTitleClick,
  renderItem,
  emptyText = "لا توجد عناصر للعرض حالياً.",
  itemClassName = "h-[420px] w-[78vw] max-w-none shrink-0 snap-start sm:w-[280px] lg:w-[300px]",
  railClassName = "",
}: DiscoveryCarouselProps<T>) {
  const railRef = useRef<HTMLDivElement | null>(null);

  function scroll(direction: "previous" | "next") {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.min(rail.clientWidth * 0.85, 720);
    rail.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="w-full py-3 md:py-4" dir="rtl">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-4 md:px-8">
        <div className="text-right" dir="rtl">
          <div className="flex items-center">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-berry transition hover:bg-linen"
              onClick={onTitleClick}
              aria-label={`عرض كل ${title}`}
              type="button"
            >
              <h2 className="text-xl font-black text-ink md:text-3xl">{title}</h2>
              <ArrowLeft size={18} aria-hidden="true" className="shrink-0" />
            </button>
          </div>
          {subtitle ? (
            <span className="mt-1 block text-sm font-bold text-stone-600">{subtitle}</span>
          ) : null}
        </div>

        <div className="hidden gap-2 sm:flex">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-ink shadow-sm transition hover:border-berry hover:text-berry"
            onClick={() => scroll("previous")}
            aria-label={`السابق: ${title}`}
            type="button"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-ink shadow-sm transition hover:border-berry hover:text-berry"
            onClick={() => scroll("next")}
            aria-label={`التالي: ${title}`}
            type="button"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed border-stone-300 bg-white/80 p-5 text-center text-sm font-bold text-stone-500 md:mx-8">
          {emptyText}
        </div>
      ) : (
        <div
          ref={railRef}
          className={`flex snap-x gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:gap-4 md:px-8 [&::-webkit-scrollbar]:hidden ${railClassName}`}
          aria-label={title}
          dir="rtl"
        >
          {items.map((item, index) => (
            <div key={index} className={itemClassName}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
