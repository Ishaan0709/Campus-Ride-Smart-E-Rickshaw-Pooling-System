import React from "react";
import { NavLink } from "@/components/NavLink";

export default function ThaparNavbar() {
  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-[#8A0000]/85 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <img
            src="/thapar-logo.png"
            alt="Thapar Logo"
            className="h-10 rounded shadow-sm"
          />
          <div className="text-white font-semibold text-lg tracking-wide">
            Campus Ride
            <div className="text-[11px] text-white/70 -mt-1 tracking-tight">
              Thapar University – Smart E-Rickshaw
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">

          {/* Student */}
          <NavLink
            to="/auth/student"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 hover:bg-white/10 text-sm font-medium transition-all duration-200"
          >
            Student
          </NavLink>

          {/* Driver */}
          <NavLink
            to="/auth/driver"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 hover:bg-white/10 text-sm font-medium transition-all duration-200"
          >
            Driver
          </NavLink>

          {/* Admin */}
          <NavLink
            to="/auth/admin"
            className="px-4 py-1.5 rounded-full border border-white/30 text-white/90 hover:bg-white/10 text-sm font-medium transition-all duration-200"
          >
            Admin
          </NavLink>

          {/* Demo */}
          <NavLink
            to="/auth/admin"
            className="px-5 py-1.5 rounded-full bg-white text-[#8A0000] font-semibold shadow hover:bg-gray-100 transition-all duration-200"
          >
            Demo
          </NavLink>

        </div>
      </div>
    </nav>
  );
}
