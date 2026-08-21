import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { LegalSection } from "@/lib/legal";

export function LegalDoc({ sections }: { sections: LegalSection[] }) {
    return (
        <div className="min-h-screen bg-background dark:bg-[#0f101e]">
            {/* Nav */}
            <nav className="border-b border-surface-dark/10 dark:border-white/10 px-8 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/nexvenue-logo.png" alt="NexVenue" width={32} height={32} className="rounded-lg" />
                        <span className="text-xl font-black tracking-tight text-surface-dark dark:text-white">NexVenue</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-sm font-bold text-surface-dark/60 dark:text-white/60 hover:text-accent transition-colors">
                        <ArrowLeft size={18} /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <article className="max-w-3xl mx-auto px-8 py-16">
                {sections.map((section, i) => {
                    switch (section.type) {
                        case "title":
                            return <h1 key={i} className="text-4xl font-black text-surface-dark dark:text-white tracking-tighter mb-2">{section.text}</h1>;
                        case "meta":
                            return <p key={i} className="text-sm font-bold text-surface-dark/55 dark:text-white/40 mb-10">{section.text}</p>;
                        case "heading":
                            return <h2 key={i} className="text-xl font-black text-surface-dark dark:text-white mt-10 mb-3">{section.text}</h2>;
                        case "paragraph":
                            return <p key={i} className="text-surface-dark/70 dark:text-white/70 font-medium leading-relaxed mb-4">{section.text}</p>;
                        case "bullets":
                            return (
                                <ul key={i} className="list-disc pl-6 space-y-2 mb-4">
                                    {section.items.map((it, j) => (
                                        <li key={j} className="text-surface-dark/70 dark:text-white/70 font-medium leading-relaxed">{it}</li>
                                    ))}
                                </ul>
                            );
                        case "contact":
                            return (
                                <div key={i} className="mt-4 p-6 rounded-2xl bg-surface-dark/5 dark:bg-white/5 border border-surface-dark/10 dark:border-white/10">
                                    {section.lines.map((line, j) => (
                                        <p key={j} className={`text-surface-dark/80 dark:text-white/80 ${j === 0 ? "font-black" : "font-medium"} leading-relaxed`}>{line}</p>
                                    ))}
                                </div>
                            );
                        default:
                            return null;
                    }
                })}
            </article>
        </div>
    );
}
