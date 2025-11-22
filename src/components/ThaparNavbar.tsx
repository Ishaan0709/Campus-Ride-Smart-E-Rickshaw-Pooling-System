import React from "react";
import { NavLink as RouterNavLink } from "react-router-dom";

function CNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        `px-5 py-2 rounded-full text-sm font-medium transition-all 
         ${
           isActive
             ? "bg-white/10 text-white ring-1 ring-red-600 shadow-md"
             : "text-white/80 hover:text-white hover:bg-white/10"
         }`
      }
    >
      {children}
    </RouterNavLink>
  );
}

export default function ThaparNavbar() {
  return (
    <nav className="
        w-full fixed top-0 left-0 z-50 
        bg-[#1A0E0E]/80 backdrop-blur-lg
        border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* LEFT — LOGO */}
        <div className="flex items-center gap-3 select-none">
          <img
            src="/thapar-logo.png"
            alt="TIET Logo"
            className="h-10 opacity-95"
            style={{ filter: "invert(100%) brightness(140%)" }}
          />
          <div>
            <div className="text-white font-semibold text-lg">Campus Ride</div>
            <div className="text-[11px] text-white/50 -mt-1">
              Thapar University — Smart E-Rickshaw
            </div>
          </div>
        </div>

        {/* RIGHT — NAV LINKS */}
        <div className="flex items-center gap-3">
          <CNavLink to="/auth/student">Student</CNavLink>
          <CNavLink to="/auth/driver">Driver</CNavLink>
          <CNavLink to="/auth/admin">Admin</CNavLink>

          <RouterNavLink
            to="/auth/student"
            className="
              px-5 py-2 rounded-full 
              bg-red-700 text-white 
              shadow-md hover:bg-red-800 
              transition font-semibold">
            Book a Ride
          </RouterNavLink>
        </div>
      </div>
    </nav>
  );
}
