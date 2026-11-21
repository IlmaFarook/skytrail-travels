import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DestinationsPage from './pages/DestinationsPage';
import PackagePage from './pages/PackagePage';
const BookingPage = lazy(() => import('./pages/BookingPage'));
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const BookingConfirmationPage = lazy(() => import('./pages/BookingConfirmationPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
import GalleryPage from './pages/GalleryPage';
import AboutPage from './pages/AboutPage';
const ComparePage = lazy(() => import('./pages/ComparePage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const CreditsPage = lazy(() => import('./pages/CreditsPage'));
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/packages/:id" element={<PackagePage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/confirmation/:reference" element={<BookingConfirmationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/credits" element={<CreditsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
