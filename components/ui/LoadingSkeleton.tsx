// Shared loading skeleton for dashboard content pages (header + stat row +
// card grid). Approximates the real layout so the page doesn't flash a
// centered spinner. Uses the same surfaces/shadows as real cards.

function Block({ className = "" }: { className?: string }) {
    return <div className={`rounded-2xl bg-surface-dark/8 dark:bg-white/8 ${className}`} />;
}

function CardBlock({ className = "" }: { className?: string }) {
    return <div className={`rounded-3xl bg-white dark:bg-[#171a2e] border border-surface-dark/6 dark:border-white/6 ${className}`} />;
}

export function LoadingSkeleton({ stats = 3, cards = 6 }: { stats?: number; cards?: number }) {
    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e] pt-24 pb-20 px-8" aria-busy="true" aria-label="Loading">
            <div className="max-w-7xl mx-auto animate-pulse">
                {/* Header */}
                <Block className="h-10 w-64 mb-3" />
                <Block className="h-5 w-96 max-w-full mb-10" />

                {/* Stat row */}
                {stats > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-10">
                        {Array.from({ length: stats }).map((_, i) => (
                            <CardBlock key={i} className="h-28" />
                        ))}
                    </div>
                )}

                {/* Card grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: cards }).map((_, i) => (
                        <CardBlock key={i} className="h-60" />
                    ))}
                </div>
            </div>
        </div>
    );
}
