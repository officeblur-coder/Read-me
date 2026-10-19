"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2, X } from "lucide-react";
import { deletePhotoAction, reorderPhotosAction, setPrimaryPhotoAction, uploadPhotosAction } from "../actions";
import { FormAlert } from "@/components/ui/field";

type Photo = { id: string; isPrimary: boolean; width: number | null; height: number | null };

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

export function PhotoManager({ vehicleId, photos: initial, canEdit, title }: { vehicleId: string; photos: Photo[]; canEdit: boolean; title: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setPhotos(initial), [initial]);

  async function upload(files: File[]) {
    if (!files.length) return;
    setError(null);
    setProgress({ done: 0, total: files.length });
    // Câte un fișier per cerere: limite de mărime previzibile și progres vizibil.
    for (const [i, f] of files.entries()) {
      const fd = new FormData();
      fd.append("photos", f);
      const res = await uploadPhotosAction(vehicleId, fd);
      if (!res.ok) {
        setError(res.error);
        break;
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    router.refresh();
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, optimistic: Photo[]) {
    const prev = photos;
    setPhotos(optimistic);
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setPhotos(prev);
        setError(res.error ?? "Operația a eșuat.");
      } else router.refresh();
    });
  }

  function onDropReorder(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = [...photos];
    const from = next.findIndex((p) => p.id === dragId);
    const to = next.findIndex((p) => p.id === targetId);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    run(() => reorderPhotosAction(vehicleId, next.map((p) => p.id)), next);
  }

  useEffect(() => {
    if (lightbox == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i! + 1) % photos.length);
      if (e.key === "ArrowLeft") setLightbox((i) => (i! - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  const primary = photos.find((p) => p.isPrimary) ?? photos[0];

  return (
    <div>
      {error && (
        <div className="mb-3">
          <FormAlert>{error}</FormAlert>
        </div>
      )}

      {primary ? (
        <button
          type="button"
          onClick={() => setLightbox(photos.indexOf(primary))}
          className="block aspect-[16/10] w-full overflow-hidden rounded-lg bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${primary.id}`} alt={title} className="h-full w-full object-cover" />
        </button>
      ) : null}

      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li
              key={p.id}
              draggable={canEdit}
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => canEdit && dragId && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onDropReorder(p.id);
              }}
              className={clsx(
                "group relative aspect-[4/3] overflow-hidden rounded-md bg-surface-2 ring-offset-2 ring-offset-surface",
                p.isPrimary && "ring-2 ring-accent",
                dragId === p.id && "opacity-40",
                canEdit && "cursor-grab active:cursor-grabbing",
              )}
            >
              <button type="button" onClick={() => setLightbox(i)} className="block h-full w-full" aria-label={`Fotografia ${i + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${p.id}?size=thumb`} alt="" className="h-full w-full object-cover" draggable={false} />
              </button>
              {canEdit && (
                <div className="absolute inset-x-1 top-1 flex justify-between opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    title={p.isPrimary ? "Imagine principală" : "Setează ca imagine principală"}
                    onClick={() =>
                      !p.isPrimary && run(() => setPrimaryPhotoAction(vehicleId, p.id), photos.map((x) => ({ ...x, isPrimary: x.id === p.id })))
                    }
                    className="grid size-6 place-items-center rounded bg-black/60 text-white"
                  >
                    <Star className={clsx("size-3.5", p.isPrimary && "fill-current")} />
                  </button>
                  <button
                    type="button"
                    title="Șterge fotografia"
                    onClick={() => {
                      if (!confirm("Ștergeți această fotografie?")) return;
                      run(() => deletePhotoAction(vehicleId, p.id), photos.filter((x) => x.id !== p.id));
                    }}
                    className="grid size-6 place-items-center rounded bg-black/60 text-white hover:bg-bad"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div
          onDragOver={(e) => {
            if (dragId) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (dragId) return;
            e.preventDefault();
            setDragOver(false);
            upload(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")));
          }}
          className={clsx(
            "mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition",
            dragOver ? "border-accent bg-accent-soft" : "border-line-strong",
          )}
        >
          <ImagePlus className="mb-2 size-5 text-muted" />
          {progress ? (
            <div className="w-full max-w-xs">
              <p className="text-[13px] font-medium">
                Se procesează {progress.done + 1 > progress.total ? progress.total : progress.done + 1} din {progress.total}…
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          ) : (
            <>
              <p className="text-[13px]">
                Trageți fotografiile aici sau{" "}
                <button type="button" onClick={() => fileInput.current?.click()} className="font-medium text-accent hover:underline">
                  alegeți fișiere
                </button>
              </p>
              <p className="mt-0.5 text-[12px] text-muted">JPG, PNG, WebP, AVIF · max. 15 MB · compresie automată, date GPS eliminate</p>
            </>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              upload(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </div>
      )}
      {canEdit && photos.length > 1 && <p className="mt-2 text-[12px] text-muted">Trageți miniaturile pentru a schimba ordinea. Steaua marchează imaginea principală.</p>}

      {lightbox != null && photos[lightbox] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Închide">
            <X className="size-6" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-3 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox - 1 + photos.length) % photos.length);
                }}
                aria-label="Anterioara"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                className="absolute right-3 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lightbox + 1) % photos.length);
                }}
                aria-label="Următoarea"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${photos[lightbox].id}`} alt="" className="max-h-full max-w-full rounded object-contain" onClick={(e) => e.stopPropagation()} />
          <p className="absolute bottom-4 text-[13px] text-white/70">
            {lightbox + 1} / {photos.length}
          </p>
        </div>
      )}
    </div>
  );
}
