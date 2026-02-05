"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Calendar,
  MessageSquare,
  Zap,
  ArrowRight,
  TrendingUp,
  Award,
  Users
} from "lucide-react";
import HeroScene from "@/components/ui/HeroScene";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Animations
      gsap.from(".hero-content > *", {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2,
        ease: "power4.out"
      });

      // Scroll Animations for sections
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-grid",
          start: "top 80%",
        },
        opacity: 0,
        scale: 0.9,
        y: 30,
        duration: 0.8,
        stagger: 0.15,
        ease: "back.out(1.7)"
      });

      gsap.from(".stats-item", {
        scrollTrigger: {
          trigger: ".stats-section",
          start: "top 80%",
        },
        opacity: 0,
        y: 20,
        duration: 0.8,
        stagger: 0.1,
        ease: "power2.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-background overflow-hidden">
      {/* Immersive Background */}
      <HeroScene />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-background/50 backdrop-blur-xl border-b border-white/10 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-black text-xl transition-transform group-hover:scale-110">N</div>
            <span className="text-2xl font-black tracking-tighter text-surface-dark">NexVenue</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-bold text-surface-dark/60 hover:text-accent transition-colors">Features</Link>
            <Link href="/events" className="text-sm font-bold text-surface-dark/60 hover:text-accent transition-colors">Events</Link>
            <div className="w-px h-4 bg-surface-dark/10" />
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
        {/* Hero Section */}
        <section ref={heroRef} className="relative pt-40 pb-32 px-8 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="hero-content space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent font-black text-sm uppercase tracking-widest">
                <Zap size={16} /> The Future of Events
              </div>

              <h1 className="text-7xl md:text-8xl font-black text-surface-dark tracking-tighter leading-[0.9]">
                Elevate Your <br />
                <span className="text-transparent bg-clip-text bg-premium-gradient">Experience</span>
              </h1>

              <p className="text-xl text-surface-dark/60 font-medium max-w-lg leading-relaxed">
                Experience conferences, expos, and gatherings like never before.
                Real-time interaction, dynamic agendas, and meaningful connections.
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

              <div className="flex items-center gap-6 pt-8">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-surface-dark/10 border-2 border-white flex items-center justify-center text-[10px] font-black">U{i}</div>
                  ))}
                </div>
                <p className="text-sm font-bold text-surface-dark/40">
                  Joined by <span className="text-surface-dark font-black">10,000+</span> attendees
                </p>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-accent/20 blur-[120px] rounded-full" />
              <GlassCard className="transition-transform hover:rotate-3 duration-500 hover:scale-105">
                <div className="aspect-[4/3] bg-surface-dark/5 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={120} className="text-accent/20" />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="h-4 w-32 bg-accent/20 rounded-full" />
                  <div className="h-4 w-full bg-surface-dark/10 rounded-full" />
                  <div className="h-4 w-2/3 bg-surface-dark/10 rounded-full" />
                </div>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats-section py-20 bg-surface-dark text-white relative">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: "Active Events", value: "250+", icon: Calendar },
              { label: "Total Users", value: "15k+", icon: Users },
              { label: "Daily Messages", value: "80k+", icon: MessageSquare },
              { label: "Happy Hosts", value: "500+", icon: Award }
            ].map((stat, i) => (
              <div key={i} className="stats-item text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto text-accent mb-4">
                  <stat.icon size={24} />
                </div>
                <div className="text-4xl font-black tracking-tight">{stat.value}</div>
                <div className="text-sm font-bold text-white/40 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32 px-8">
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="text-5xl font-black text-surface-dark tracking-tighter mb-6">Built for Modern Events</h2>
            <p className="text-lg text-surface-dark/60 font-medium max-w-2xl mx-auto">
              Everything you need to run, attend, or discover amazing event experiences in one powerful platform.
            </p>
          </div>

          <div className="features-grid max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Dynamic Agendas",
                desc: "Live, interactive schedules that keep everyone updated in real-time.",
                icon: Calendar
              },
              {
                title: "Smart Networking",
                desc: "Connect with attendees through intelligent matching and instant chat.",
                icon: Users
              },
              {
                title: "Global Reach",
                desc: "From local meetups to global expos, NexVenue scales with your needs.",
                icon: Zap
              }
            ].map((feature, i) => (
              <GlassCard key={i} className="feature-card !p-10 group hover:border-accent/40 transition-colors">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-8 group-hover:scale-110 transition-transform">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-black text-surface-dark mb-4">{feature.title}</h3>
                <p className="text-surface-dark/60 font-medium leading-relaxed">{feature.desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-surface-dark/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-black">N</div>
            <span className="text-xl font-black tracking-tight text-surface-dark">NexVenue</span>
          </div>
          <div className="flex gap-8">
            <Link href="#" className="text-sm font-bold text-surface-dark/60 hover:text-accent">Privacy</Link>
            <Link href="#" className="text-sm font-bold text-surface-dark/60 hover:text-accent">Terms</Link>
            <Link href="#" className="text-sm font-bold text-surface-dark/60 hover:text-accent">Contact</Link>
          </div>
          <p className="text-sm font-bold text-surface-dark/20 uppercase tracking-widest">© 2026 NexVenue Inc.</p>
        </div>
      </footer>
    </div>
  );
}
