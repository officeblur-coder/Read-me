import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { COPY, type Lang } from './content/hero';
import { SEO, seoKey } from './content/seo';
import { activateSiteLang, baseLang, locale, tr, prepareSiteLang, saveSiteLang, siteLang, startSiteLang, type SiteLang } from './lib/i18n';
import { Header } from './components/Header';
import { SkiPage } from './components/ski/SkiPage';
import { ArrivalPage } from './components/arrival/ArrivalPage';
import { TopPage, TopTeaser } from './components/top/TopPage';
import { PlacesPage, ToursPage } from './components/tours/ToursPage';
import { ExplorePage } from './components/ExplorePage';
import { SideRail } from './components/SideRail';
import { PromoPopup } from './components/PromoPopup';
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
import { VirtualTour } from './components/tour/VirtualTour';
import { BackToTop } from './components/BackToTop';
import { ContactPage } from './components/contact/ContactPage';
import { MountainPage } from './components/mountain/MountainPage';
import { MountainTeaser } from './components/mountain/MountainTeaser';
import { DualStay } from './components/DualStay';
import { SummerPage, WinterPage } from './components/activities/WinterPage';
import { PR_COPY, type RoomKey } from './content/pensionPage';
import { AlpineExperienceSection } from './components/experience/AlpineExperienceSection';
import { AlpineMapSection } from './components/map/AlpineMapSection';
import { GuestStoriesSection } from './components/stories/GuestStoriesSection';
import { FinalBookingCTA } from './components/retreat/FinalBookingCTA';
import { SiteFooter } from './components/SiteFooter';
import type { BookingBarHandle, BookingRequest } from './components/BookingBar';
import { useFinePointer, useReducedMotion } from './lib/hooks';
import { LANGS, PATHS, SITE, currentRoute, go, pathFor, pathLang, relinkPages, switchPathLang, type Route } from './lib/routes';
import { pageSchema, shareImage } from './lib/schema';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function App() {
  const [site, setSite] = useState<SiteLang>(siteLang);
  const lang: Lang = baseLang(site);
  const setLang = useCallback((l: SiteLang) => {
    saveSiteLang(l);
    if (switchPathLang(l)) return;
    prepareSiteLang(l).catch(() => undefined).then(() => { activateSiteLang(l); flushSync(() => setSite(l)); startSiteLang(); relinkPages(); });
  }, []);
  const [compact, setCompact] = useState(false);
  const [menu, setMenu] = useState(false);
  const booking = useRef<BookingBarHandle>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const copy = COPY[lang];

  // dedicated pages: #activities-summer / #activities-winter (live site: /activities/summer|winter)
  // preview routing by hash: #pension, #activities-summer|winter (live site: /pension/, /activities/summer|winter)
  // #room-<key> → room pages (live: /rooms/<slug>/); #pension-rooms → pension page at the room section
  const routeOf = currentRoute;
  const [page, setPage] = useState<Route>(routeOf);
  useEffect(() => {
    const toRooms = () => {
      const target = window.location.hash === '#pension-rooms' ? 'rooms' : window.location.hash === '#groups-plan' ? 'g-planner' : window.location.hash === '#ski-passes' ? 'sk-passes' : window.location.hash === '#explore-map' ? 'explore-map' : '';
      if (target) window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'auto', block: 'start' }), 80);
    };
    const on = () => {
      document.documentElement.style.overflow = '';
      const r = routeOf();
      const pl = pathLang();
      if (pl && pl !== siteLang()) setLang(pl);
      setPage((prev) => { if (prev !== r) window.setTimeout(() => window.scrollTo(0, 0), 0); return r; });
      toRooms();
    };
    toRooms();
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => { document.documentElement.lang = site; }, [site]);
  // SEO: title + description (+ Open Graph) per route and language
  useEffect(() => {
    const [title, desc] = SEO[seoKey(page)][lang];
    const set = (sel: string, attr: string, val: string) => {
      let m = document.head.querySelector<HTMLMetaElement>(sel);
      if (!m) { m = document.createElement('meta'); const [k, v] = sel.replace(/^meta\[|\]$/g, '').split('='); m.setAttribute(k, v.replace(/"/g, '')); document.head.appendChild(m); }
      m.setAttribute(attr, val);
    };
    const cut = title.lastIndexOf(' · KitzAlpen');
    document.title = cut > 0 ? tr(title.slice(0, cut)) + title.slice(cut) : tr(title);
    let description = tr(desc);
    if (page.startsWith('room-')) {
      // each room page has its own title and description
      const r = PR_COPY[lang].rooms[page.slice(5) as RoomKey];
      document.title = `${tr(r.label)}${title.slice(cut)}`;
      description = `${tr(r.text)} ${description}`;
    }
    set('meta[name="description"]', 'content', description);
    set('meta[property="og:title"]', 'content', document.title);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:locale"]', 'content', locale(lang).replace('-', '_'));
    if (PATHS) {
      // canonical + the same page in every language (hreflang), so each address is indexed in its own language
      const url = SITE + pathFor(page, site);
      set('meta[property="og:url"]', 'content', url);
      let c = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.appendChild(c); }
      c.href = url;
      document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((n) => n.remove());
      for (const l of [...LANGS, 'x-default' as const]) {
        const a = document.createElement('link'); a.rel = 'alternate'; a.hreflang = l;
        a.href = SITE + pathFor(page, l === 'x-default' ? 'de' : l); document.head.appendChild(a);
      }
      set('meta[property="og:image"]', 'content', shareImage(page));
      // structured data for this page: WebPage, breadcrumb, room / chalet / restaurant details
      const plain = (r: Route) => { const t0 = SEO[seoKey(r)][lang][0]; const k = t0.lastIndexOf(' · KitzAlpen'); return tr(k > 0 ? t0.slice(0, k) : t0); };
      const name = document.title.replace(/ · KitzAlpen.*$/, '');
      let ld = document.getElementById('ld-page');
      if (!ld) { ld = document.createElement('script'); ld.id = 'ld-page'; ld.setAttribute('type', 'application/ld+json'); document.head.appendChild(ld); }
      ld.textContent = JSON.stringify(pageSchema(page, site, name, description, plain));
    }
  }, [page, site, lang]);
  // activities: the shared Sommer/Winter switch also switches between the two activity pages
  const { season, setSeason } = useSeason();
  const seasonMounted = useRef(false);
  useEffect(() => { if ((page === 'summer' || page === 'winter') && page !== season) setSeason(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!seasonMounted.current) { seasonMounted.current = true; return; }
    if ((page === 'summer' || page === 'winter') && page !== season) go(`#activities-${season}`, site);
  }, [season]); // eslint-disable-line react-hooks/exhaustive-deps
  // switching language must never leave header items hidden (they start hidden until the intro reveals them)
  const langMounted = useRef(false);
  useEffect(() => {
    if (!langMounted.current) { langMounted.current = true; return; }
    gsap.set('.js-head', { autoAlpha: 1, y: 0 });
  }, [site]);

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
      <Header lang={lang} copy={copy} compact={compact} fine={fine && !reduced} menuOpen={menu} site={site} onLang={setLang} onMenu={() => setMenu(true)} showSeason={page === 'ski' || page === 'arrival' || page === 'pension' || page === 'chalet' || page === 'contact' || page === 'mountain' || page === 'summer' || page === 'winter' || page === 'all-rooms' || page.startsWith('room-')} />
      <MobileMenu open={menu} lang={lang} copy={copy} reduced={reduced} site={site} onClose={() => setMenu(false)} onLang={setLang} onBook={onBook} />
      {page === 'mountain' ? (
        <main id="main"><MountainPage lang={lang} /></main>
      ) : page === 'contact' ? (
        <main id="main"><ContactPage lang={lang} /></main>
      ) : page === 'explore' ? (
        <main id="main"><ExplorePage lang={lang} /></main>
      ) : page === 'tours' ? (
        <main id="main"><ToursPage lang={lang} /></main>
      ) : page === 'places' ? (
        <main id="main"><PlacesPage lang={lang} /></main>
      ) : page === 'experiences' ? (
        <main id="main"><TopPage lang={lang} /></main>
      ) : page === 'arrival' ? (
        <main id="main"><ArrivalPage lang={lang} /></main>
      ) : page === 'ski' ? (
        <main id="main"><SkiPage lang={lang} /></main>
      ) : page === 'groups' ? (
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
        <DualStay lang={lang} />
        <MountainTeaser lang={lang} />
        <TopTeaser lang={lang} />
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
      <VirtualTour lang={lang} />
      <BackToTop lang={lang} reduced={reduced} />
      <QuickActions lang={lang} reduced={reduced} />
      <SideRail lang={lang} hidden={menu} />
      <PromoPopup lang={lang} reduced={reduced} blocked={menu} />
    </>
  );
}
