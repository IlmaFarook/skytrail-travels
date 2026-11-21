import { useTranslation } from 'react-i18next';
import PlaceArt, { toneFor } from './PlaceArt';

// A destination's photo, or the drawn illustration if it has none.
export default function DestinationImage({ photo, place, category, flip, decorative = false, eager = false, sizes }) {
  const { t } = useTranslation();

  if (photo) {
    const file = `/images/destinations/${photo.image}`;
    const set = (ext) => `${file}-480.${ext} 480w, ${file}-800.${ext} 800w, ${file}-1280.${ext} 1280w`;
    const imageSizes = sizes || '(max-width: 700px) 100vw, 400px';
    return (
      <picture>
        <source type="image/webp" srcSet={set('webp')} sizes={imageSizes} />
        <img
          className="place-art place-photo"
          src={`${file}-800.jpg`}
          srcSet={set('jpg')}
          sizes={imageSizes}
          width="1280"
          height="853"
          alt={decorative ? '' : photo.alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          decoding="async"
        />
      </picture>
    );
  }

  return (
    <PlaceArt
      place={place}
      tone={toneFor(category)}
      flip={flip}
      label={decorative ? undefined : t('a11y.illustration', { name: place })}
    />
  );
}
