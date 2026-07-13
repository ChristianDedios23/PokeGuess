interface PokeballIconProps {
  className?: string;
}

export function PokeballIcon({ className = "h-6 w-6" }: PokeballIconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#fff" stroke="#18181b" strokeWidth="2" />
      <path d="M2 20a18 18 0 0 1 36 0z" fill="#dc2626" stroke="#18181b" strokeWidth="2" />
      <line x1="2" y1="20" x2="14" y2="20" stroke="#18181b" strokeWidth="2" />
      <line x1="26" y1="20" x2="38" y2="20" stroke="#18181b" strokeWidth="2" />
      <circle cx="20" cy="20" r="6" fill="#fff" stroke="#18181b" strokeWidth="2" />
      <circle cx="20" cy="20" r="2.5" fill="#18181b" />
    </svg>
  );
}
