import { clsx } from "clsx";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function LockerIcon({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: 24, md: 32, lg: 48 };
  const d = dims[size];
  return (
    <svg
      width={d}
      height={d}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Locker body */}
      <rect x="6" y="14" width="36" height="30" rx="4" fill="url(#lockerGrad)" />
      {/* Door outline */}
      <rect x="10" y="18" width="28" height="22" rx="3" fill="rgba(0,0,0,0.25)" />
      {/* Shackle */}
      <path
        d="M17 14 C17 8 31 8 31 14"
        stroke="url(#shackleGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Keyhole circle */}
      <circle cx="24" cy="27" r="4" fill="rgba(255,255,255,0.15)" />
      {/* Keyhole slot */}
      <rect x="22.5" y="27" width="3" height="5" rx="1.5" fill="rgba(255,255,255,0.15)" />
      {/* Highlight */}
      <rect x="10" y="18" width="28" height="3" rx="2" fill="rgba(255,255,255,0.08)" />
      <defs>
        <linearGradient id="lockerGrad" x1="6" y1="14" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="shackleGrad" x1="17" y1="8" x2="31" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const textSizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <LockerIcon size={size} />
      {showText && (
        <span className={clsx("font-bold tracking-tight gradient-text", textSizes[size])}>
          Locker
        </span>
      )}
    </div>
  );
}
