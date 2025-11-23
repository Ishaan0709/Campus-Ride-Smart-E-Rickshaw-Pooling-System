import React from "react";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          © {new Date().getFullYear()} Thapar Campus Mobility Service — Thapar University
        </div>
        <div className="text-sm text-gray-500">
          Designed with ❤️ for Thapar Campus
        </div>
      </div>
    </footer>
  );
}
