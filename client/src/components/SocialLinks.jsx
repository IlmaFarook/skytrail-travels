import { useTranslation } from 'react-i18next';
import { useSite } from '../context/SiteContext';

const networks = ['facebook', 'instagram', 'tiktok'];

export default function SocialLinks() {
  const { t } = useTranslation();
  const { business } = useSite();
  if (!business) return null;

  return (
    <ul className="social-links">
      {networks.map(key => (
        <li key={key}>
          <a href={business.social[key]} target="_blank" rel="noopener noreferrer">
            {t(`social.${key}`)}<span className="sr-only"> {t('a11y.opensNewTab')}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
