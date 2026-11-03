import type { Lang } from '../content/hero';
import { NAV } from '../content/hero';
import { Logo } from './Logo';

/**
 * Minimal footer for the preview, with the contact data published on kitzalpen.at.
 * On the live site keep the existing footer – only its background should match
 * var(--k-deep) so the closing section fades straight into it.
 */
export function SiteFooter({ lang }: { lang: Lang }) {
  const de = lang === 'de';
  return (
    <footer className="bg-deep px-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] pt-14 text-cream/75 sm:px-6 md:px-10 md:pb-14 lg:px-14">
      <div className="mx-auto grid max-w-[1360px] gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo className="w-[160px] text-cream" />
          <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed">{de ? 'Gästehaus im Salzburger Land – Unterkunft in Hollersbach im Pinzgau, Österreich.' : 'Guesthouse in the Salzburger Land – accommodation in Hollersbach im Pinzgau, Austria.'}</p>
        </div>
        <nav aria-label={de ? 'Schnelllinks' : 'Quick links'}>
          <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-gold-light">{de ? 'Schnelllinks' : 'Quick links'}</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[14px]">
            {NAV[lang].map((n) => <li key={n.href}><a href={n.href} className="hover:text-cream">{n.label}</a></li>)}
          </ul>
        </nav>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.24em] text-gold-light">{de ? 'Kontakt' : 'Contact'}</p>
          <address className="mt-4 text-[14px] not-italic leading-relaxed">Reitlehen 42, 5731 Hollersbach im Pinzgau<br />Salzburg, Austria<br />+43 664 2376571<br />kitzbuhelalpenpension@gmail.com</address>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-[1360px] border-t border-cream/10 pt-6 text-[12.5px] text-cream/50">© 2026 Kitzbühel Alpen Pension</p>
    </footer>
  );
}
