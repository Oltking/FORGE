export function Diamond({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 2L22 9L12 22L2 9L12 2Z"
        fill="url(#dg)"
        stroke="#f59e0b"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M2 9H22M12 2V22M7 9L12 22M17 9L12 22M7 9L12 2M17 9L12 2" stroke="#1a0e00" strokeWidth="0.5" opacity="0.5" />
      <defs>
        <linearGradient id="dg" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#ff7a18" />
        </linearGradient>
      </defs>
    </svg>
  );
}
