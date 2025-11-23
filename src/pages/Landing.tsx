import React from "react";
import ThaparNavbar from "@/components/ThaparNavbar";
import HeroThapar from "@/components/HeroThapar";
import MapPanel from "@/components/MapPanel";

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#AA0000]/10 flex items-center justify-center text-[#AA0000] font-bold text-xl">
          R
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
    <div className="min-h-screen bg-[#F7F7F7]">
      <ThaparNavbar />

      <main className="pt-16">
        <HeroThapar />

        {/* Why section */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why Campus Ride?</h2>
            <p className="text-gray-600 mt-3 max-w-2xl mx-auto text-lg">
              Smart pooling built for Thapar students — save time, reduce congestion, and track rides easily.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard
              title="Quick Pickup"
              desc="Fast match algorithm for minimal wait times."
            />
            <FeatureCard
              title="Real-time Tracking"
              desc="Live driver location and estimated arrival."
            />
            <FeatureCard
              title="Safe & Verified"
              desc="OTP verification for every ride."
            />
          </div>
        </section>

        {/* Map Section */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 pb-20">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Live demo map preview</h3>

          <div className="rounded-3xl overflow-hidden shadow-md border bg-white">
            <MapPanel height="350px" showControls={false} />
          </div>
        </section>


      </main>
    </div>
  );
}
