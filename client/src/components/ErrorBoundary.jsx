import { Component } from 'react';
import i18n from '../i18n';

// Stops one broken page from blanking the whole site.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="container section-top" role="alert">
        <h1>{i18n.t('pageError.heading')}</h1>
        <p>{i18n.t('pageError.text')}</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          {i18n.t('pageError.reload')}
        </button>
      </section>
    );
  }
}
