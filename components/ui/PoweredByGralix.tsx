import Image from "next/image";

/**
 * "Powered by Gralix" attribution. `tone="light"` for dark surfaces
 * (event/QA pages), default for light surfaces. Swap /gralix-mark.png for the
 * higher-res / vector logo when it's available.
 */
export function PoweredByGralix({
    className = "",
    tone = "muted",
}: {
    className?: string;
    tone?: "muted" | "light";
}) {
    const text =
        tone === "light"
            ? "text-white/45 hover:text-white/80"
            : "text-surface-dark/45 dark:text-white/40 hover:text-accent";
    return (
        <a
            href="https://gralix.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by Gralix"
            className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide transition-colors ${text} ${className}`}
        >
            <Image src="/gralix-mark.png" alt="" width={16} height={16} className="rounded-[3px]" />
            Powered by Gralix
        </a>
    );
}
