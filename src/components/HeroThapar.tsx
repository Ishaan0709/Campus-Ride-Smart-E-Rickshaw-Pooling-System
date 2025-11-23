import React from "react";

export default function HeroThapar() {
  return (
    <header className="relative h-[85vh] flex items-center justify-start bg-white">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/thapar.jpg')" }}
      />

      {/* LEFT ALIGNED CONTENT – no box, only white text */}
      <div className="relative z-10 max-w-3xl px-16 text-left">
        <h1 className="text-5xl font-extrabold text-white leading-tight drop-shadow-lg">
          Thapar Campus Mobility Service
        </h1>

        <p className="mt-5 text-lg text-white/90 leading-relaxed max-w-xl drop-shadow-md">
          A secure, efficient and eco-friendly transportation service inside Thapar
          University. Real-time tracking, student verification & intelligent pooling.
        </p>

        <div className="mt-8 flex justify-start gap-4">
          <a
            href="/auth/admin"
            className="px-7 py-3 bg-[#AA0000] rounded-full text-white text-lg font-semibold shadow hover:bg-[#8a0000] transition"
          >
            Demo
          </a>

          <a
            href="/auth/student"
            className="px-7 py-3 rounded-full border border-white/70 text-white text-lg font-semibold bg-white/5 hover:bg-white/15 transition"
          >
            Student Login
          </a>

          <a
            href="/auth/driver"
            className="px-7 py-3 rounded-full border border-white/70 text-white text-lg font-semibold bg-white/5 hover:bg-white/15 transition"
          >
            Driver Login
          </a>
        </div>
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
