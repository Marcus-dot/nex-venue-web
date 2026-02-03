"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Calendar, Users, Zap, ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-bold text-xl">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight text-surface-dark">NexVenue</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-surface-dark/70 font-medium">
          <Link href="#features" className="hover:text-accent transition-colors">Features</Link>
          <Link href="/events" className="hover:text-accent transition-colors">Explore</Link>
          <Link href="/login" className="px-5 py-2 hover:text-accent transition-colors">Login</Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-8 pt-20 pb-32 max-w-7xl mx-auto flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="px-4 py-2 rounded-full bg-accent/10 text-accent font-semibold text-sm mb-6 inline-block">
            Revolutionizing Event Experiences
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-surface-dark mb-8 leading-tight tracking-tighter">
            Your Events, <br />
            <span className="text-accent">Simplified.</span>
          </h1>
          <p className="text-xl text-surface-dark/60 max-w-2xl mb-12 leading-relaxed">
            Experience conferences, expos, and community gatherings like never before.
            Discover, connect, and stay in the loop with NexVenue.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/events">
              <Button size="lg" className="flex items-center gap-2">
                Discover Events <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Host an Event
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid Preview */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 w-full" id="features">
          <motion.div
            whileHover={{ y: -10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <GlassCard className="h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 font-bold">
                <Calendar size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-surface-dark">Dynamic Agendas</h3>
              <p className="text-surface-dark/60 leading-relaxed">
                Stay updated with real-time schedule changes and personalized event tracks.
              </p>
            </GlassCard>
          </motion.div>

          <motion.div
            whileHover={{ y: -10 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          >
            <GlassCard className="h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mb-6">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-surface-dark">Meaningful Connections</h3>
              <p className="text-surface-dark/60 leading-relaxed">
                Connect with speakers and fellow attendees through our smart networking features.
              </p>
            </GlassCard>
          </motion.div>

          <motion.div
            whileHover={{ y: -10 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
          >
            <GlassCard className="h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-6">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-surface-dark">Real-time Engagement</h3>
              <p className="text-surface-dark/60 leading-relaxed">
                Participate in live discussions and receive instant announcements during events.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* App Stats / Social Proof */}
      <section className="bg-surface-dark text-white py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div>
            <div className="text-5xl font-black text-accent mb-2">50+</div>
            <div className="text-text-dark/60 font-medium">Global Events</div>
          </div>
          <div>
            <div className="text-5xl font-black text-accent mb-2">10k+</div>
            <div className="text-text-dark/60 font-medium">Active Attendees</div>
          </div>
          <div>
            <div className="text-5xl font-black text-accent mb-2">200+</div>
            <div className="text-text-dark/60 font-medium">Expert Speakers</div>
          </div>
          <div>
            <div className="text-5xl font-black text-accent mb-2">4.9/5</div>
            <div className="text-text-dark/60 font-medium">User Rating</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-surface-dark/5 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-surface-dark">NexVenue</span>
          </div>
          <p className="text-surface-dark/40 text-sm">
            © 2025 NexVenue Web. All rights reserved.
          </p>
          <div className="flex gap-6 text-surface-dark/60 text-sm font-medium">
            <Link href="#" className="hover:text-accent">Terms</Link>
            <Link href="#" className="hover:text-accent">Privacy</Link>
            <Link href="#" className="hover:text-accent">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
