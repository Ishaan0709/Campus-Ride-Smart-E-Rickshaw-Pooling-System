import React from "react";
import { NavLink } from "@/components/NavLink";

export default function ThaparNavbar() {
  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-[#9A0000]/85 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src="/thapar-logo.png"
            alt="Thapar Logo"
            className="h-10 rounded shadow-sm"
          />
          <div className="text-white font-semibold text-lg tracking-wide">
            Campus Ride
            <div className="text-[11px] text-white/70 -mt-1 tracking-tight">
              Thapar University — Smart E-Rickshaw
            </div>
          </div>
        </div>

        {/* Aesthetic Buttons */}
        <div className="flex items-center gap-3">

          <NavLink
            to="/auth/student"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-200"
            activeClassName="bg-white/20 border-white/60 text-white"
          >
            Student
          </NavLink>

          <NavLink
            to="/auth/driver"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-200"
            activeClassName="bg-white/20 border-white/60 text-white"
          >
            Driver
          </NavLink>

          <NavLink
            to="/auth/admin"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/40 transition-all duration-200"
            activeClassName="bg-white/20 border-white/60 text-white"
          >
            Admin
          </NavLink>

          {/* CTA */}
          <NavLink
            to="/"
            className="px-5 py-1.5 rounded-full bg-white text-[#9A0000] font-semibold shadow hover:bg-gray-100 hover:shadow-md transition-all duration-200"
          >
            Book a Ride
          </NavLink>

        </div>
      </div>
    </nav>
  );
}
