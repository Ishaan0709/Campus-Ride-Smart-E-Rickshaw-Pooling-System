import React from "react";
import { NavLink } from "@/components/NavLink";

export default function ThaparNavbar() {
  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-[#AA0000]/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/thapar-logo.png"
            alt="Thapar Logo"
            className="h-10 rounded-md shadow"
          />
          <div className="text-white font-semibold text-lg">
            Campus Ride
            <div className="text-[11px] text-white/80 -mt-1">
              Thapar University — Smart E-Rickshaw
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-4">

          <NavLink
            to="/auth/student"
            className="px-4 py-2 text-white/90 hover:text-white transition text-sm font-medium"
          >
            Student Login
          </NavLink>

          <NavLink
            to="/auth/driver"
            className="px-4 py-2 text-white/90 hover:text-white transition text-sm font-medium"
          >
            Driver Login
          </NavLink>

          <NavLink
            to="/auth/admin"
            className="px-4 py-2 text-white/90 hover:text-white transition text-sm font-medium"
          >
            Admin
          </NavLink>

          <NavLink
            to="/"
            className="px-5 py-2 rounded-full bg-white text-[#AA0000] font-semibold shadow hover:bg-gray-100 transition"
          >
            Book a Ride
          </NavLink>

        </div>

      </div>
    </nav>
  );
}
