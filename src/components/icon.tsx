
type IconName =
  | "key"
  | "arrow-up-right"
  | "shield"
  | "zap"
  | "terminal"
  | "lock"
  | "check"
  | "chevron-right";

export default function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  const paths: Record<IconName, React.ReactNode> = {
    key: <>
      <circle cx="8" cy="15" r="5" />
      <path d="m11.5 11.5 9-9M17 6l2 2M14 9l2 2" />
    </>,
    "arrow-up-right": <path d="M7 17 17 7M7 7h10v10" />,
    shield: <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />,
    zap: <path d="m13 2-3 9h8L9 22l3-9H4l9-11Z" />,
    terminal: <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>,
    lock: <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>,
    check: <path d="m5 12 4 4L19 6" />,
    "chevron-right": <path d="m9 18 6-6-6-6" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
