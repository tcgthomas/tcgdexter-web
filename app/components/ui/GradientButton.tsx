import Link from "next/link";

/**
 * Primary CTA button with the warm brand gradient fill + optional
 * stacked-cards icon. Renders as an `<a>` if `href` is provided,
 * else a `<button>`.
 */
export default function GradientButton({
  children,
  href,
  onClick,
  showIcon = true,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  showIcon?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-brand hover:shadow-brand-lg transition bg-gradient-brand disabled:opacity-50 disabled:cursor-not-allowed";

  const content = (
    <>
      {showIcon && (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${base} ${className}`}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${className}`}>
      {content}
    </button>
  );
}
