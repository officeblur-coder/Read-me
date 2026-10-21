import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { SitePhoto as Photo } from '../domain/types';
import { SitePhoto } from './SitePhoto';
import { fmtDate } from '../domain/format';

export function PhotoViewer({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  useEffect(() => {
    if (index === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [index, photos.length, onClose, onIndex]);
  if (index === null || !photos[index]) return null;
  const ph = photos[index];
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink-900/95 p-4 sm:p-8" onClick={onClose}>
      <div className="flex items-center justify-between text-white">
        <div className="text-[13px]"><span className="font-medium">{fmtDate(ph.date)}</span> <span className="text-white/60">· {ph.caption}</span></div>
        <button className="rounded p-1.5 text-white/70 hover:bg-white/10" aria-label="Închide"><X size={20} /></button>
      </div>
      <div className="relative mt-4 flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <SitePhoto stage={ph.stage} seed={ph.seed} dataUrl={ph.dataUrl} className="aspect-[16/10] max-h-full w-full max-w-5xl rounded-lg" />
        {photos.length > 1 && (
          <>
            <button onClick={() => onIndex((index - 1 + photos.length) % photos.length)} className="absolute left-0 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Anterioara"><ChevronLeft /></button>
            <button onClick={() => onIndex((index + 1) % photos.length)} className="absolute right-0 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Următoarea"><ChevronRight /></button>
          </>
        )}
      </div>
      <div className="mt-3 text-center text-[12px] text-white/50">{index + 1} / {photos.length}</div>
    </div>
  );
}
