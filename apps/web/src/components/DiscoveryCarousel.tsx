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
}

export default function DiscoveryCarousel<T>({
  title,
  subtitle,
  items,
  onTitleClick,
  renderItem,
  emptyText = "لا توجد عناصر للعرض حالياً.",
  itemClassName = "w-[78vw] max-w-none shrink-0 snap-start sm:w-[280px] lg:w-[300px]",
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
    <section className="w-full py-5" dir="rtl">
      <div className="mb-3 flex items-end justify-between gap-3 px-4 md:px-8">
        <div className="text-right" dir="rtl">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-berry shadow-sm transition hover:border-berry hover:bg-linen"
              onClick={onTitleClick}
              aria-label={`عرض كل ${title}`}
              type="button"
            >
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <h2 className="text-2xl font-black text-ink md:text-3xl">{title}</h2>
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
          className="flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden"
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
