import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="band-ink grid-field relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-22rem] right-[-12rem] h-[38rem] w-[38rem] rounded-full bg-gradient-gold opacity-[0.12] blur-[130px]"
      />
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28">
        <p className="eyebrow eyebrow-rule text-gold">{eyebrow}</p>
        <h1 className="text-display mt-8 max-w-3xl text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
        {description && (
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">{description}</p>
        )}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}
