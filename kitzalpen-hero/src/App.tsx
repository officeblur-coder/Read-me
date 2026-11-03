import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { COPY, type Lang } from './content/hero';
import { Header } from './components/Header';
import { MobileMenu } from './components/MobileMenu';
import { Hero } from './components/Hero';
import { RoomsSection } from './components/rooms/RoomsSection';
import { AmenitiesSection } from './components/amenities/AmenitiesSection';
import { QuickActions } from './components/QuickActions';
import { ChaletSection } from './components/chalet/ChaletSection';
import type { BookingBarHandle, BookingRequest } from './components/BookingBar';
import { useFinePointer, useReducedMotion } from './lib/hooks';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (document.documentElement.lang === 'en' ? 'en' : 'de'));
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const booking = useRef<BookingBarHandle>(null);
  const next = useRef<HTMLElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const copy = COPY[lang];

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // header: transparent → compact after a little scroll
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // next section enters with an editorial mask reveal (placeholder only)
  useGSAP(() => {
    if (reduced) return;
    gsap.fromTo('.js-next-mask', { clipPath: 'inset(18% 8% 18% 8%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
      scrollTrigger: { trigger: next.current, start: 'top bottom', end: 'top 30%', scrub: 0.6 },
    });
  }, { scope: next, dependencies: [reduced] });

  const onBook = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(() => booking.current?.focusArrival(), reduced ? 0 : 450);
  }, [reduced]);

  const onSubmit = useCallback((r: BookingRequest) => {
    // Integration point: hand the request to the real booking engine / enquiry form.
    window.dispatchEvent(new CustomEvent('kitzalpen:booking-request', { detail: r }));
  }, []);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ivory focus:px-4 focus:py-2 focus:text-forest">{copy.skip}</a>
      <Header lang={lang} copy={copy} compact={compact} fine={fine && !reduced} menuOpen={menu} onLang={setLang} onBook={onBook} onMenu={() => setMenu(true)} />
      <MobileMenu open={menu} lang={lang} copy={copy} reduced={reduced} onClose={() => setMenu(false)} onLang={setLang} onBook={onBook} />
      <main id="main">
        <Hero lang={lang} copy={copy} bookingRef={booking} onBookingSubmit={onSubmit} />
        <RoomsSection lang={lang} />
        <AmenitiesSection lang={lang} />
        <ChaletSection lang={lang} />
        <section ref={next} aria-label="Platzhalter" className="relative bg-cream px-[max(16px,env(safe-area-inset-left))] py-24 text-forest md:px-14 md:py-36">
          <div className="js-next-mask mx-auto max-w-[1100px] rounded-[2px] bg-[#ebe4d5] px-6 py-24 text-center md:py-36">
            <p className="text-[12px] font-semibold uppercase tracking-[.3em] text-champagne-dark">Platzhalter</p>
            <p className="mt-4 font-display text-[clamp(30px,4vw,52px)] font-medium italic leading-tight">{copy.next}</p>
          </div>
        </section>
        {/* keeps the last content clear of the mobile quick-action bar */}
        <div aria-hidden className="h-[96px] bg-cream md:hidden" />
      </main>
      <QuickActions lang={lang} reduced={reduced} />
    </>
  );
}
