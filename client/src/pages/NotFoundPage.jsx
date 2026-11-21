import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.notFound.title'));
  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('notFound.eyebrow')}</p><h1>{t('notFound.heading')}</h1><p>{t('notFound.intro')}</p></div></div>
      <section className="container">
        <div className="empty-box">
          <p>{t('notFound.try')}</p>
          <p>
            <Link to="/" className="btn btn-outline">{t('notFound.home')}</Link>{' '}
            <Link to="/destinations" className="btn btn-primary">{t('notFound.browse')}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
