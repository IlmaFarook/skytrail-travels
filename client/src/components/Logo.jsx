export default function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 27 C13 10 27 10 33 24" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeDasharray="1.5 4.5" strokeLinecap="round" />
      <path d="M33 24 l-3.2 -6.4 l7 1.6Z" fill="var(--terracotta)" transform="translate(-3 3) rotate(18 33 24)" />
      <circle cx="7" cy="27" r="2.6" fill="currentColor" />
    </svg>
  );
}
