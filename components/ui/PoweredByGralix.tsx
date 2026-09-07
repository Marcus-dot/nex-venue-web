/* eslint-disable @next/next/no-img-element */

/**
 * "Powered by Gralix" attribution with the Gralix wordmark.
 * tone="light" for always-dark surfaces (event/QA pages); the default "muted"
 * follows the app theme (navy logo on light, white logo on dark).
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
            ? "text-white/50 hover:text-white/80"
            : "text-surface-dark/45 dark:text-white/40 hover:text-accent";
    return (
        <a
            href="https://gralix.co"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by Gralix"
            className={`inline-flex items-center gap-1.5 text-xs font-medium tracking-wide transition-colors ${text} ${className}`}
        >
            <span>Powered by</span>
            {tone === "light" ? (
                <img src="/gralix-logo-white.svg" alt="Gralix" className="h-3.5 w-auto" />
            ) : (
                <>
                    <img src="/gralix-logo.svg" alt="Gralix" className="h-3.5 w-auto dark:hidden" />
                    <img src="/gralix-logo-white.svg" alt="Gralix" className="hidden h-3.5 w-auto dark:block" />
                </>
            )}
        </a>
    );
}
