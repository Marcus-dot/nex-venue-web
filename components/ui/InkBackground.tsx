// Organic "ink in water" backdrop, soft, drifting colour clouds whose edges are
// distorted by SVG turbulence so they read as diffusing ink rather than the
// generic AI radial-blur blobs. Purely decorative; sits behind content.
export default function InkBackground({ className = "" }: { className?: string }) {
    return (
        <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
            {/* Turbulence filter that gives the blobs their inky, feathered edges */}
            <svg className="absolute h-0 w-0" aria-hidden focusable="false">
                <filter id="ink-turb" x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
                    <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves={2} seed={7} result="noise" />
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale={68} xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </svg>

            <div className="ink-blob ink-blob-1" />
            <div className="ink-blob ink-blob-2" />
            <div className="ink-blob ink-blob-3" />
        </div>
    );
}
