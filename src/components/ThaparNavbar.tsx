import React from "react";
import { NavLink } from "@/components/NavLink";

export default function ThaparNavbar() {
  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-[#7B0000] shadow">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <img
            src="/thapar-logo.png"
            alt="Thapar Logo"
            className="h-12 w-auto object-contain" /* made logo bigger */
          />
          <div className="text-white font-semibold text-lg leading-tight">
            Campus Ride
            <div className="text-[11px] text-white/80">
              Thapar University — Smart E-Rickshaw
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-4">
          <NavLink
            to="/auth/student"
            className="px-5 py-2 rounded-full border border-white/60 text-white text-sm hover:bg-white/10 transition"
          >
            Student
          </NavLink>

          <NavLink
            to="/auth/driver"
            className="px-5 py-2 rounded-full border border-white/60 text-white text-sm hover:bg-white/10 transition"
          >
            Driver
          </NavLink>

          <NavLink
            to="/auth/admin"
            className="px-5 py-2 rounded-full border border-white/60 text-white text-sm hover:bg-white/10 transition"
          >
            Admin
          </NavLink>

          {/* NOTE: removed white Demo from navbar as requested */}
        </div>
      </div>
    </nav>
  );
}
