import { Navigate, useLocation } from 'react-router-dom';

// only paths inside this site are used as a "go back to" address
export function safePath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : null;
}

// where a signed-in person goes after logging in, or when they open the login page again
export function homeFor(user) {
  return user.role === 'admin' ? '/admin' : '/';
}

// what to render for a page that needs a login: send them to the login page and bring them back
export function LoginRedirect() {
  const location = useLocation();
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}
