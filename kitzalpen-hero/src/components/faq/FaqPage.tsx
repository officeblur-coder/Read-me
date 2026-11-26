import type { Lang } from '../../content/hero';
import { FAQ, FAQ_COPY } from '../../content/faq';

/** FAQ page – plain, fast and fully readable without JavaScript (native <details>). */
export function FaqPage({ lang }: { lang: Lang }) {
  const t = FAQ_COPY[lang];
  return (
    <div className="bg-cream text-ink">
      <section id="top" aria-labelledby="faq-title" className="bg-deep text-cream">
        <div className="mx-auto w-full max-w-[1100px] px-5 pb-14 pt-40 sm:px-6 md:px-10 md:pb-20 lg:pt-[220px]">
          <p className="text-[11.5px] font-semibold uppercase tracking-[.34em] text-cream/90 md:text-[13px]">{t.eyebrow}</p>
          <h1 id="faq-title" className="mt-4 font-display font-normal leading-[1.02] tracking-[-0.012em] md:mt-6" style={{ fontSize: 'clamp(40px, 5.4vw, 84px)' }}>
            <span className="block">{t.title[0]}</span>
            <span className="block italic text-gold-light">{t.title[1]}</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-[16px] leading-relaxed text-cream/90 md:text-[18px]">{t.sub}</p>
          <nav aria-label={t.eyebrow} className="mt-8 flex flex-wrap gap-2">
            {FAQ.map((g) => <a key={g.id} href={`#faq-${g.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`faq-${g.id}`)?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex min-h-11 items-center rounded-full border border-cream/30 px-4 text-[14px] font-semibold text-cream/90 hover:border-gold-light">{g.title[lang]}</a>)}
          </nav>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1100px] px-5 py-14 sm:px-6 md:px-10 md:py-20">
        {FAQ.map((g) => (
          <section key={g.id} id={`faq-${g.id}`} aria-labelledby={`faq-${g.id}-h`} className="mb-12 scroll-mt-28 md:mb-16">
            <h2 id={`faq-${g.id}-h`} className="font-display text-[30px] font-medium italic leading-tight text-pine md:text-[42px]">{g.title[lang]}</h2>
            <div className="mt-5 divide-y divide-ink/15 border-y border-ink/15">
              {g.items.map((f) => (
                <details key={f.q.en} className="faq-item group py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold leading-snug text-ink md:text-[19px]">
                    <h3 className="font-semibold">{f.q[lang]}</h3>
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/25 text-[18px] leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="pb-5 pr-10">
                    <p className="text-[16px] leading-relaxed text-ink/80">{f.a[lang]}</p>
                    {f.more && (
                      <a href={f.more.href} {...(f.more.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})} className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-pine underline decoration-pine/40 underline-offset-4 hover:decoration-pine">
                        {f.more.label[lang]} <span aria-hidden>→</span>
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-[16px] text-ink/80">{t.ask} <a href="#contact" className="font-semibold text-pine underline underline-offset-4">{t.askCta}</a></p>
      </div>
    </div>
  );
}
