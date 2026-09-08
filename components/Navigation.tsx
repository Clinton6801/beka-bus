"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="BEKA Academy"
                width={40}
                height={40}
                className="w-9 h-9 sm:w-10 sm:h-10"
                priority
              />
              <div className="flex flex-col leading-none">
                <span className="text-sm sm:text-base font-bold text-purple-600">BEKA</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Bus Portal</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center space-x-6">
            <Link
              href="/register"
              className="text-gray-700 hover:text-purple-600 font-medium text-sm transition-colors"
            >
              Register
            </Link>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                const code = prompt("Enter your reference code:");
                if (code) window.location.href = `/registration/${code}/status`;
              }}
              className="text-gray-700 hover:text-purple-600 font-medium text-sm transition-colors cursor-pointer"
            >
              Check Status
            </a>
            <Link
              href="/parent/login"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Parent Portal
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-purple-600 hover:bg-gray-100 focus:outline-none transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="sm:hidden pb-4 border-t border-gray-200">
            <Link
              href="/register"
              className="block px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Register
            </Link>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                const code = prompt("Enter your reference code:");
                if (code) window.location.href = `/registration/${code}/status`;
                setIsOpen(false);
              }}
              className="block px-4 py-2 text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded font-medium transition-colors cursor-pointer"
            >
              Check Status
            </a>
            <Link
              href="/parent/login"
              className="block px-4 py-2 text-purple-600 hover:bg-purple-50 font-medium transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Parent Portal
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

