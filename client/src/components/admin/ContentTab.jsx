import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import ManageList from './ManageList';

export default function ContentTab() {
  const { t } = useTranslation();

  const testimonialFields = [
    { name: 'name', label: t('admin.content.testimonials.fields.name') },
    { name: 'quote', label: t('admin.content.testimonials.fields.quote'), type: 'textarea' },
    { name: 'rating', label: t('admin.content.testimonials.fields.rating'), type: 'number', min: 1, max: 5 },
  ];
  const testimonialColumns = [
    { label: t('admin.content.testimonials.columns.name'), render: x => x.name },
    { label: t('admin.content.testimonials.columns.quote'), render: x => x.quote },
    { label: t('admin.content.testimonials.columns.rating'), render: x => t('common.ratingShort', { rating: x.rating }) },
  ];

  const postFields = [
    { name: 'title', label: t('admin.content.posts.fields.title') },
    { name: 'body', label: t('admin.content.posts.fields.body'), type: 'textarea' },
  ];
  const postColumns = [
    { label: t('admin.content.posts.columns.title'), render: p => p.title },
    { label: t('admin.content.posts.columns.body'), render: p => p.body },
  ];

  const faqFields = [
    { name: 'question', label: t('admin.content.faqs.fields.question') },
    { name: 'answer', label: t('admin.content.faqs.fields.answer'), type: 'textarea' },
  ];
  const faqColumns = [
    { label: t('admin.content.faqs.columns.question'), render: f => f.question },
    { label: t('admin.content.faqs.columns.answer'), render: f => f.answer },
  ];

  return (
    <>
      <ManageList
        title={t('admin.content.testimonials.heading')}
        kind="testimonial"
        idPrefix="Testimonial"
        load={() => api.getTestimonials()}
        create={data => api.adminCreate('testimonials', data)}
        update={(id, data) => api.adminUpdate('testimonials', id, data)}
        remove={id => api.adminDelete('testimonials', id)}
        columns={testimonialColumns}
        fields={testimonialFields}
        blank={{ name: '', quote: '', rating: '5' }}
      />
      <ManageList
        title={t('admin.content.posts.heading')}
        kind="post"
        idPrefix="Post"
        load={() => api.getBlog()}
        create={data => api.adminCreate('blog', data)}
        update={(id, data) => api.adminUpdate('blog', id, data)}
        remove={id => api.adminDelete('blog', id)}
        columns={postColumns}
        fields={postFields}
        blank={{ title: '', body: '' }}
      />
      <ManageList
        title={t('admin.content.faqs.heading')}
        kind="faq"
        idPrefix="FAQ"
        load={() => api.getFaqs()}
        create={data => api.adminCreate('faqs', data)}
        update={(id, data) => api.adminUpdate('faqs', id, data)}
        remove={id => api.adminDelete('faqs', id)}
        columns={faqColumns}
        fields={faqFields}
        blank={{ question: '', answer: '' }}
      />
    </>
  );
}
