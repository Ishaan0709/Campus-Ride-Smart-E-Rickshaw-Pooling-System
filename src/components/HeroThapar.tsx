import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroThapar() {
  return (
    <section className="
      pt-32 pb-24 
      bg-gradient-to-b from-[#220F0F] to-[#150A0A] 
      text-white relative">

      {/* Decorative Glow */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 w-72 h-72 bg-red-800/20 blur-3xl rounded-full"></div>
        <div className="absolute right-0 bottom-0 w-72 h-72 bg-red-900/20 blur-3xl rounded-full"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT — TEXT */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Smart E-Rickshaw Pooling
              <span className="block text-red-400 mt-2">
                for Thapar Campus
              </span>
            </h1>

            <p className="mt-6 text-gray-300 text-lg max-w-lg">
              Pool with classmates, reduce congestion, and ride safely with
              real-time tracking — built exclusively for TIET students.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                to="/auth/student"
                className="
                  px-6 py-3 rounded-full 
                  bg-red-700 hover:bg-red-800 
                  text-white font-semibold 
                  shadow-xl shadow-red-900/40
                  flex items-center gap-2 transition">
                Book a Ride <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="#features"
                className="
                  px-6 py-3 rounded-full 
                  bg-white/10 border border-white/20
                  hover:bg-white/20 text-gray-200 
                  transition">
                Learn More
              </Link>
            </div>
          </div>

          {/* RIGHT — IMAGE */}
          <div className="relative">
            <img
              src="/hero-rickshaw.png"
              alt="Campus Ride Rickshaw"
              className="
                w-full rounded-2xl 
                shadow-[0_12px_40px_rgba(0,0,0,0.65)] 
                border border-white/10"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
