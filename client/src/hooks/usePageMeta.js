import { useEffect } from 'react';
import { t } from 'i18next';

// The server sets the title on first load. This keeps it right when moving between pages.
export default function usePageMeta(title, description) {
  useEffect(() => {
    if (title) document.title = title + ' | ' + t('brand.fullName');
    if (description) {
      const tag = document.querySelector('meta[name="description"]');
      if (tag) tag.setAttribute('content', description);
    }
  }, [title, description]);
}
