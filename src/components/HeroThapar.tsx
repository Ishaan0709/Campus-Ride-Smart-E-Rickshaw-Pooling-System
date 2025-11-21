import React from "react";

export default function HeroThapar() {
  return (
    <header className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden">
      
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center brightness-75"
        style={{
          backgroundImage:
            "url('/thapar.jpg')",
        }}
      />

      {/* White Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/0 to-white/40" />

      {/* Content */}
      <div className="relative z-10 px-6 sm:px-10 max-w-4xl text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white drop-shadow-xl leading-tight">
          Campus Ride  
          <span className="block text-[#FFECEC]">Smart E-Rickshaw Pooling</span>
        </h1>

        <p className="mt-6 text-xl sm:text-2xl text-gray-200 drop-shadow">
          Faster, safer and greener rides inside Thapar University.
          Pool with classmates, track rides in real time & verify with OTP.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="/"
            className="px-7 py-3 rounded-full bg-[#AA0000] text-white text-lg font-semibold shadow-lg hover:bg-[#8a0000] hover:shadow-xl transition"
          >
            Book a Ride
          </a>

          <a
            href="/auth/student"
            className="px-7 py-3 rounded-full border-2 border-white/60 text-white text-lg font-semibold hover:bg-white/10 transition"
          >
            Student Login
          </a>
        </div>
      </div>
    </header>
  );
}
