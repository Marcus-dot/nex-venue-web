"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Calendar,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Users,
  BarChart3,
  QrCode,
  Radio,
} from "lucide-react";
import InkBackground from "@/components/ui/InkBackground";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-content > *", {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out",
      });

      gsap.from(".feature-card", {
        scrollTrigger: { trigger: ".features-grid", start: "top 80%" },
        opacity: 0,
        scale: 0.9,
        y: 30,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.7)",
      });

      gsap.from(".stats-item", {
        scrollTrigger: { trigger: ".stats-section", start: "top 80%" },
        opacity: 0,
        y: 20,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-background dark:bg-[#0f101e] overflow-hidden">
      <InkBackground />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-background/50 dark:bg-[#0f101e]/80 backdrop-blur-xl border-b border-white/10 dark:border-white/5 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <Image src="/nexvenue-logo.png" alt="NexVenue" width={40} height={40} className="rounded-xl transition-transform group-hover:scale-110" />
            <span className="text-2xl font-black tracking-tighter text-surface-dark dark:text-white">NexVenue</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-bold text-surface-dark/60 dark:text-white/60 hover:text-accent transition-colors">Features</Link>
            <div className="w-px h-4 bg-surface-dark/10 dark:bg-white/10" />
            <Link href="/login">
              <Button variant="ghost" className="font-bold">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="font-black px-6">Join Now</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section ref={heroRef} className="relative pt-40 pb-32 px-8 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="hero-content space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent font-black text-sm uppercase tracking-widest">
                <Sparkles size={16} /> For Conferences &amp; Professional Events
              </div>

              <h1 className="text-6xl md:text-7xl font-black text-surface-dark dark:text-white tracking-tighter leading-[0.95]">
                Bring your event <br />
                <span className="text-accent">to life</span>
              </h1>

              <p className="text-xl text-surface-dark/60 dark:text-white/60 font-medium max-w-lg leading-relaxed">
                One app for your whole event: register and check in with a QR pass, follow the live agenda, run moderated Q&amp;A and live polls, and let attendees connect and chat.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/events">
                  <Button size="lg" className="px-8 text-lg font-black group h-16">
                    Explore Events <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="px-8 text-lg font-black h-16">
                    Host an Event
                  </Button>
                </Link>
              </div>

              {/* Honest capability pills · no fabricated numbers */}
              <div className="flex flex-wrap gap-2 pt-4">
                {["Live agenda", "Q&A & polls", "Networking", "QR check-in"].map((cap) => (
                  <span key={cap} className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-dark/5 dark:bg-white/5 text-surface-dark/60 dark:text-white/60 border border-surface-dark/10 dark:border-white/10">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Product preview · honest feature snapshot */}
            <div className="hidden lg:block relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/20 blur-[120px] rounded-full" />
              <GlassCard className="transition-transform hover:rotate-3 duration-500 hover:scale-105 !p-8">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="space-y-3">
                  {[
                    { icon: Radio, label: "Now live · Keynote", tint: "text-red-500" },
                    { icon: MessageSquare, label: "Audience Q&A · 12 approved", tint: "text-accent" },
                    { icon: BarChart3, label: "Live poll · 84% voted", tint: "text-blue-500" },
                    { icon: QrCode, label: "Check-in · scan to enter", tint: "text-green-500" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-surface-dark/5 dark:bg-white/5">
                      <row.icon size={18} className={row.tint} />
                      <span className="text-sm font-bold text-surface-dark/80 dark:text-white/80">{row.label}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Capability strip · honest, no invented metrics */}
        <section className="stats-section py-20 bg-surface-dark text-white relative">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Live Agenda", icon: Calendar },
              { label: "Moderated Q&A", icon: MessageSquare },
              { label: "Polls & Ratings", icon: BarChart3 },
              { label: "QR Check-in", icon: QrCode },
            ].map((item, i) => (
              <div key={i} className="stats-item text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto text-accent mb-4">
                  <item.icon size={24} />
                </div>
                <div className="text-lg font-black tracking-tight">{item.label}</div>
                <div className="text-sm font-bold text-white/40 uppercase tracking-widest">Built in</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-32 px-8">
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="text-5xl font-black text-surface-dark dark:text-white tracking-tighter mb-6">Built for modern events</h2>
            <p className="text-lg text-surface-dark/60 dark:text-white/60 font-medium max-w-2xl mx-auto">
              Everything you need to run a conference, engage your audience, and help people connect, in one platform.
            </p>
          </div>

          <div className="features-grid max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Live agenda & sessions",
                desc: "A real-time schedule attendees can follow: what's on now, how to plan around parallel tracks, and a notification the moment a session goes live.",
                icon: Calendar,
              },
              {
                title: "Audience engagement",
                desc: "Moderated Q&A, live polls, and session ratings that turn a passive audience into an active one, with a big-screen projection view for the room.",
                icon: BarChart3,
              },
              {
                title: "Register, network & check in",
                desc: "Attendees register in-app, get a QR pass, and check in at the door. Then connect, exchange details, and chat with other attendees.",
                icon: Users,
              },
            ].map((feature, i) => (
              <GlassCard key={i} className="feature-card !p-10 group hover:border-accent/40 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-8 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-black text-surface-dark dark:text-white mb-4">{feature.title}</h3>
                <p className="text-surface-dark/60 dark:text-white/60 font-medium leading-relaxed">{feature.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-950/80 border-t border-surface-dark/5 dark:border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/nexvenue-logo.png" alt="NexVenue" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-black tracking-tight text-surface-dark dark:text-white">NexVenue</span>
          </Link>
          <div className="flex gap-8">
            <Link href="/privacy" className="text-sm font-bold text-surface-dark/60 dark:text-white/60 hover:text-accent">Privacy</Link>
            <Link href="/terms" className="text-sm font-bold text-surface-dark/60 dark:text-white/60 hover:text-accent">Terms</Link>
            <a href="mailto:info@gralix.co" className="text-sm font-bold text-surface-dark/60 dark:text-white/60 hover:text-accent">Contact</a>
          </div>
          <p className="text-sm font-bold text-surface-dark/40 dark:text-white/40">
            © 2026 <span className="text-surface-dark/60 dark:text-white/60">Gralix Technologies</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
