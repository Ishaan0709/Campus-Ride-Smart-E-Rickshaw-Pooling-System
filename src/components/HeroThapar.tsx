import React from "react";

export default function HeroThapar() {
  return (
    <header className="relative h-[85vh] flex items-center justify-center bg-white">

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/thapar.jpg')" }}
      />

      {/* Soft Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/40" />

      {/* Centered Content */}
      <div className="relative z-10 text-center max-w-3xl px-6">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
          Campus Ride — Smart E-Rickshaw Pooling
        </h1>

        <p className="mt-5 text-lg text-gray-700 leading-relaxed">
          Faster, safer and greener rides inside Thapar University. Pool with classmates,
          track rides in real time & verify with OTP.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/"
            className="px-7 py-3 bg-[#AA0000] rounded-full text-white text-lg font-semibold shadow hover:bg-[#8a0000] transition"
          >
            Book a Ride
          </a>

          <a
            href="/auth/student"
            className="px-7 py-3 rounded-full border border-gray-400 text-gray-700 text-lg font-semibold hover:bg-gray-100 transition"
          >
            Student Login
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          <b>Note:</b> UI-only upgrade. Backend routes and demo flows remain identical.
        </p>
      </div>

      {/* Info Card */}
      <div className="absolute bottom-12 right-12 bg-white rounded-2xl shadow-xl border p-5 w-64">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#AA0000]/10 flex items-center justify-center text-[#AA0000] font-bold">
            TI
          </div>
          <div>
            <p className="font-semibold text-gray-900">Next Pickup</p>
            <p className="text-sm text-gray-600">Gate 3 · 2 min away</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700 leading-relaxed">
          Pool with up to 4 students · Live GPS · OTP verification
        </p>
      </div>
    </header>
  );
}
