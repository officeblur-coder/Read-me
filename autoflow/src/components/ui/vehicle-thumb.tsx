import { Car } from "lucide-react";
import clsx from "clsx";

export function VehicleThumb({ photoId, className, alt }: { photoId: string | null; className?: string; alt: string }) {
  if (!photoId) {
    return (
      <div className={clsx("grid place-items-center bg-surface-2 text-muted", className)}>
        <Car className="size-5" strokeWidth={1.5} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/media/${photoId}?size=thumb`} alt={alt} loading="lazy" className={clsx("object-cover", className)} />;
}
