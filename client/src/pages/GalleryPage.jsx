import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import DestinationImage from '../components/DestinationImage';
import usePageMeta from '../hooks/usePageMeta';

export default function GalleryPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.gallery.title'), t('meta.gallery.description'));
  const [posts, setPosts] = useState(null);
  const [destinations, setDestinations] = useState(null);

  useEffect(() => {
    api.getBlog().then(setPosts).catch(() => setPosts([]));
    api.getDestinations().then(setDestinations).catch(() => setDestinations([]));
  }, []);

  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('gallery.eyebrow')}</p><h1>{t('gallery.heading')}</h1><p>{t('gallery.intro')}</p></div></div>

      <section className="container">
        <div className="gallery-grid">
          {destinations === null && <p>{t('common.loading')}</p>}
          {destinations?.map(d => (
            <figure className="gallery-item" key={d.id}>
              <DestinationImage photo={d.photo} place={d.name} sizes="(max-width: 700px) 100vw, 380px" />
              <figcaption className="gallery-caption"><strong>{d.name}</strong><span>{d.description}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      {destinations !== null && (
      <section className="container">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('gallery.journalTitle')}</h2><p className="section-sub">{t('gallery.journalSub')}</p></div></header>
        <div className="grid">
          {posts === null && <p>{t('gallery.loadingPosts')}</p>}
          {posts?.map((p, i) => (
            <article className="card post" key={p.title}><div className="card-body">
              <div className="meta">{t('gallery.journalNo', { n: i + 1 })}</div>
              <h3>{p.title}</h3>
              <p className="desc">{p.body}</p>
            </div></article>
          ))}
        </div>
      </section>
      )}
    </>
  );
}
