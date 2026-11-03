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
import { WeatherBand } from './components/WeatherBand';
import { ChaletSection } from './components/chalet/ChaletSection';
import { RestaurantSection } from './components/restaurant/RestaurantSection';
import { ActivitiesSection } from './components/activities/ActivitiesSection';
import { ActivitiesPage } from './components/activities/ActivitiesPage';
import { PensionHero } from './components/pension/PensionHero';
import { AlpineExperienceSection } from './components/experience/AlpineExperienceSection';
import { AlpineMapSection } from './components/map/AlpineMapSection';
import { GuestStoriesSection } from './components/stories/GuestStoriesSection';
import { FinalBookingCTA } from './components/retreat/FinalBookingCTA';
import { SiteFooter } from './components/SiteFooter';
import type { Season } from './content/hero';
import type { BookingBarHandle, BookingRequest } from './components/BookingBar';
import { useFinePointer, useReducedMotion } from './lib/hooks';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (document.documentElement.lang === 'en' ? 'en' : 'de'));
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const booking = useRef<BookingBarHandle>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const copy = COPY[lang];

  // dedicated pages: #activities-summer / #activities-winter (live site: /activities/summer|winter)
  // preview routing by hash: #pension, #activities-summer|winter (live site: /pension/, /activities/summer|winter)
  type Route = 'home' | 'pension' | Season;
  const routeOf = (): Route => { const h = window.location.hash; return h === '#pension' ? 'pension' : h === '#activities-summer' ? 'summer' : h === '#activities-winter' ? 'winter' : 'home'; };
  const [page, setPage] = useState<Route>(routeOf);
  useEffect(() => {
    const on = () => { const r = routeOf(); setPage((prev) => { if (prev !== r) window.setTimeout(() => window.scrollTo(0, 0), 0); return r; }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // subpages have no hero intro, which normally reveals the header items
  useEffect(() => {
    if (page === 'home') return;
    gsap.fromTo('.js-head', { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: reduced ? 0 : 0.6, stagger: reduced ? 0 : 0.05, delay: reduced ? 0 : 0.25, ease: 'power3.out' });
  }, [page, reduced]);

  // header: transparent → compact after a little scroll
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);


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
      <WeatherBand lang={lang} reduced={reduced} />
      <Header lang={lang} copy={copy} compact={compact} fine={fine && !reduced} menuOpen={menu} onLang={setLang} onMenu={() => setMenu(true)} showSeason={page === 'pension'} />
      <MobileMenu open={menu} lang={lang} copy={copy} reduced={reduced} onClose={() => setMenu(false)} onLang={setLang} onBook={onBook} />
      {page === 'pension' ? (
        <main id="main"><PensionHero lang={lang} /></main>
      ) : page !== 'home' ? (
        <main id="main"><ActivitiesPage season={page} lang={lang} /></main>
      ) : (
      <main id="main">
        <Hero lang={lang} copy={copy} bookingRef={booking} onBookingSubmit={onSubmit} />
        <RoomsSection lang={lang} />
        <AmenitiesSection lang={lang} />
        <ChaletSection lang={lang} />
        <RestaurantSection lang={lang} />
        <ActivitiesSection lang={lang} />
        <AlpineExperienceSection lang={lang} />
        <AlpineMapSection lang={lang} />
        <GuestStoriesSection lang={lang} />
        <FinalBookingCTA lang={lang} />
      </main>
      )}
      <SiteFooter lang={lang} />
      <QuickActions lang={lang} reduced={reduced} />
    </>
  );
}
