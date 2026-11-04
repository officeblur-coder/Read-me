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
import { useSeason } from './lib/season';
import { PensionHero } from './components/pension/PensionHero';
import { PensionRooms } from './components/pension/PensionRooms';
import { PensionFinalCTA } from './components/pension/PensionFinalCTA';
import { RoomPage } from './components/pension/RoomPage';
import { ChaletPage } from './components/chalet/ChaletPage';
import { AllRoomsPage } from './components/pension/AllRoomsPage';
import { DiningPage } from './components/restaurant/DiningPage';
import { GroupsPage } from './components/groups/GroupsPage';
import { SummerPage, WinterPage } from './components/activities/WinterPage';
import { ROOM_KEYS, type RoomKey } from './content/pensionPage';
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
  // #room-<key> → room pages (live: /rooms/<slug>/); #pension-rooms → pension page at the room section
  type Route = 'home' | 'pension' | 'chalet' | 'all-rooms' | 'restaurant' | 'groups' | Season | `room-${RoomKey}`;
  const routeOf = (): Route => {
    const h = window.location.hash.slice(1);
    if (h === 'pension' || h === 'pension-rooms') return 'pension';
    if (h === 'chalet') return 'chalet';
    if (h === 'all-rooms') return 'all-rooms';
    if (h === 'restaurant') return 'restaurant';
    if (h === 'groups') return 'groups';
    if (h === 'activities-summer') return 'summer';
    if (h === 'activities-winter') return 'winter';
    if (h.startsWith('room-') && ROOM_KEYS.includes(h.slice(5) as RoomKey)) return h as Route;
    return 'home';
  };
  const [page, setPage] = useState<Route>(routeOf);
  useEffect(() => {
    const toRooms = () => { if (window.location.hash === '#pension-rooms') window.setTimeout(() => document.getElementById('rooms')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 80); };
    const on = () => {
      document.documentElement.style.overflow = '';
      const r = routeOf();
      setPage((prev) => { if (prev !== r) window.setTimeout(() => window.scrollTo(0, 0), 0); return r; });
      toRooms();
    };
    toRooms();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  // activities: the shared Sommer/Winter switch also switches between the two activity pages
  const { season, setSeason } = useSeason();
  const seasonMounted = useRef(false);
  useEffect(() => { if ((page === 'summer' || page === 'winter') && page !== season) setSeason(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!seasonMounted.current) { seasonMounted.current = true; return; }
    if ((page === 'summer' || page === 'winter') && page !== season) window.location.hash = `#activities-${season}`;
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps
  // switching language must never leave header items hidden (they start hidden until the intro reveals them)
  const langMounted = useRef(false);
  useEffect(() => {
    if (!langMounted.current) { langMounted.current = true; return; }
    gsap.set('.js-head', { autoAlpha: 1, y: 0 });
  }, [lang]);

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
      <Header lang={lang} copy={copy} compact={compact} fine={fine && !reduced} menuOpen={menu} onLang={setLang} onMenu={() => setMenu(true)} showSeason={page === 'pension' || page === 'chalet' || page === 'summer' || page === 'winter' || page === 'all-rooms' || page.startsWith('room-')} />
      <MobileMenu open={menu} lang={lang} copy={copy} reduced={reduced} onClose={() => setMenu(false)} onLang={setLang} onBook={onBook} />
      {page === 'groups' ? (
        <main id="main"><GroupsPage lang={lang} /></main>
      ) : page === 'restaurant' ? (
        <main id="main"><DiningPage lang={lang} /></main>
      ) : page === 'all-rooms' ? (
        <main id="main"><AllRoomsPage lang={lang} /></main>
      ) : page === 'chalet' ? (
        <main id="main"><ChaletPage lang={lang} /></main>
      ) : page.startsWith('room-') ? (
        <main id="main"><RoomPage key={page} k={page.slice(5) as RoomKey} lang={lang} /></main>
      ) : page === 'pension' ? (
        <main id="main"><PensionHero lang={lang} /><PensionRooms lang={lang} /><PensionFinalCTA lang={lang} /></main>
      ) : page !== 'home' ? (
        <main id="main">{page === 'winter' ? <WinterPage lang={lang} /> : <SummerPage lang={lang} />}</main>
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
