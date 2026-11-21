import { useTranslation } from 'react-i18next';
import usePageMeta from '../hooks/usePageMeta';

const sectionIds = ['collect', 'why', 'cookies', 'third', 'keep', 'rights', 'changes'];

export default function PrivacyPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.privacy.title'), t('meta.privacy.description'));
  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('privacy.eyebrow')}</p><h1>{t('privacy.heading')}</h1><p>{t('privacy.intro')}</p></div></div>
      <section className="container prose">
        {sectionIds.map(id => (
          <div key={id}>
            <h2>{t(`privacy.sections.${id}.title`)}</h2>
            <p>{t(`privacy.sections.${id}.text`)}</p>
          </div>
        ))}
      </section>
    </>
  );
}
