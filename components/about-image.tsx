/* Responsive WebP files are prepared locally, without a runtime image service. */
/* eslint-disable @next/next/no-img-element */
import photos from "@/content/about-photos.data.json";

type PhotoId = keyof typeof photos;

export function aboutPhotoPath(id: PhotoId) {
  return `/images/sobre-mi/${id}-${Math.max(...photos[id].widths)}.webp`;
}

export function AboutImage({
  id,
  alt,
  eager = false,
  sizes = "(max-width: 700px) 90vw, (min-width: 1400px) 700px, 50vw",
}: {
  id: PhotoId;
  alt: string;
  eager?: boolean;
  sizes?: string;
}) {
  const photo = photos[id];
  return (
    <img
      src={aboutPhotoPath(id)}
      srcSet={photo.widths
        .map((width) => `/images/sobre-mi/${id}-${width}.webp ${width}w`)
        .join(", ")}
      sizes={sizes}
      alt={alt}
      width={photo.width}
      height={photo.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}
