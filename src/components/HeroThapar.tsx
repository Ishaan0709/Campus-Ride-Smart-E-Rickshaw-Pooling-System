import React from "react";

export default function HeroThapar() {
  return (
    <header className="relative h-[90vh] flex items-center justify-start">
      
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center brightness-75"
        style={{
          backgroundImage: "url('/thapar.jpg')",
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {/* Left-aligned content */}
      <div className="relative z-10 px-10 max-w-2xl ml-6">
        <h1 className="text-5xl font-extrabold text-white leading-tight drop-shadow">
          Campus Ride  
          <span className="block text-[#FFDADA]">Smart E-Rickshaw Pooling</span>
        </h1>

        <p className="mt-6 text-xl text-white/90 leading-relaxed">
          Faster, safer and greener rides inside Thapar University.
          Pool with classmates, track rides in real time & verify with OTP.
        </p>

        <div className="mt-10 flex gap-4">
          <a
            href="/"
            className="px-7 py-3 bg-[#AA0000] rounded-full text-white text-lg font-semibold shadow-lg hover:bg-[#8a0000] transition"
          >
            Book a Ride
          </a>

          <a
            href="/auth/student"
            className="px-7 py-3 border-2 border-white/70 text-white rounded-full text-lg font-semibold hover:bg-white/10 transition"
          >
            Student Login
          </a>
        </div>
      </div>
    </header>
  );
}
