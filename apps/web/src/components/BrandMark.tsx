export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <mask id="isomill-mark-eye">
          <circle cx="32" cy="32" r="24" fill="#fff" />
          <circle cx="32" cy="32" r="16.25" fill="#000" />
          <circle cx="32" cy="32" r="14.5" fill="#fff" />
          <rect
            x="25.4"
            y="25.4"
            width="13.2"
            height="13.2"
            fill="#000"
            transform="rotate(45 32 32)"
          />
        </mask>
      </defs>
      <circle cx="32" cy="32" r="24" fill="currentColor" mask="url(#isomill-mark-eye)" />
    </svg>
  );
}
