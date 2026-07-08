import logo from "../assets/saknaha-logo.png";
import type { ReactNode } from "react";

interface FooterProps {
  onHome: () => void;
  onOwner: () => void;
  onUser: () => void;
  onCities: () => void;
  onFaq: () => void;
  onSupport: () => void;
}

export default function Footer({
  onHome,
  onOwner,
  onUser,
  onCities,
  onFaq,
  onSupport,
}: FooterProps) {
  return (
    <footer className="border-t border-stone-200/70 bg-white/75">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 py-8 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] md:px-8">
        <div>
          <img src={logo} alt="سكنها" className="h-14 w-32 object-contain object-right" />
          <p className="mt-3 max-w-md text-sm font-bold leading-7 text-stone-600">
            سكنها منصة تساعد الباحثات عن السكن وأصحاب الوحدات على الوصول لبعضهم بطريقة أوضح وأسهل.
          </p>
          <span className="mt-4 inline-flex w-fit rounded-full border border-stone-200 bg-linen px-3 py-1 text-xs font-black text-stone-600">
            نسخة تجريبية
          </span>
        </div>

        <FooterGroup title="البحث عن سكن">
          <FooterButton onClick={onHome}>الرئيسية</FooterButton>
          <FooterButton onClick={onCities}>تصفح المدن</FooterButton>
          <FooterButton onClick={onUser}>أبحث عن سكن</FooterButton>
        </FooterGroup>

        <FooterGroup title="لأصحاب السكن">
          <FooterButton onClick={onOwner}>عرض وحدة سكنية</FooterButton>
          <FooterButton onClick={onOwner}>إدارة السكن</FooterButton>
          <FooterButton onClick={onSupport}>خدمة التصوير</FooterButton>
        </FooterGroup>

        <FooterGroup title="الدعم">
          <FooterButton onClick={onSupport}>تواصل معنا</FooterButton>
          <FooterButton onClick={onSupport}>الإبلاغ عن مشكلة</FooterButton>
          <FooterButton onClick={onFaq}>الأسئلة الشائعة</FooterButton>
        </FooterGroup>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <div className="mt-3 flex flex-col items-start gap-2 text-sm font-bold text-stone-600">
        {children}
      </div>
    </div>
  );
}

function FooterButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="transition hover:text-berry" onClick={onClick}>
      {children}
    </button>
  );
}
