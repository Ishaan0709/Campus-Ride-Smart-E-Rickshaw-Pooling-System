import React from "react";
import ThaparNavbar from "@/components/ThaparNavbar";
import HeroThapar from "@/components/HeroThapar";
import MapPanel from "@/components/MapPanel";

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border hover:shadow-xl transition">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#AA0000]/10 flex items-center justify-center text-[#AA0000] font-bold text-xl">
          {icon ?? "•"}
        </div>
        <div>
          <div className="font-semibold text-gray-900 text-lg">{title}</div>
          <div className="text-sm text-gray-600 mt-1 leading-relaxed">{desc}</div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🌟 NAVBAR */}
      <ThaparNavbar />

      <main>

        {/* 🌟 PREMIUM HERO */}
        <HeroThapar />

        {/* 🌟 FEATURES SECTION */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why Campus Ride?</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-lg leading-relaxed">
              A smarter, safer and faster way to commute within Thapar University.  
              Save time, reduce waiting and enjoy a clean e-rickshaw experience.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard
              title="Quick Pickup"
              desc="Fast match algorithm ensures minimum waiting time for students."
            />
            <FeatureCard
              title="Real-time Tracking"
              desc="Live driver location with smooth map updates and ETA calculation."
            />
            <FeatureCard
              title="Safe & Verified"
              desc="Every ride is OTP-verified for maximum safety and accountability."
            />
          </div>
        </section>

        {/* 🌟 MAP SECTION — CLEAN, PREMIUM */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 pb-20">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Live Campus Map</h3>

          <div className="rounded-3xl overflow-hidden shadow-xl border bg-white">
            <MapPanel height="350px" showControls={false} />
          </div>
        </section>

        {/* 🌟 FOOTER */}
        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} Campus Ride — Thapar University
            </div>
            <div className="text-sm text-gray-500">
              Designed with ❤️ for Thapar Campus
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}
