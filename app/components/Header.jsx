"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [username, setUsername] = useState("User");
  const router = useRouter();
  const dropdownRef = useRef();

  const handleLogout = () => {
    document.cookie = "auth-token=; Max-Age=0; path=/"; // hapus cookie
    router.push("/login");
  };

  useEffect(() => {
    // Ambil auth-token dari cookie dan ekstrak username
    const match = document.cookie.match(/auth-token=([^;]+)/);
    if (match) {
      const token = match[1]; // contoh: admin_uid_12345
      const name = token.split("_")[0]; // ambil 'admin' dari 'admin_uid_12345'
      setUsername(name.charAt(0).toUpperCase() + name.slice(1)); // Kapitalisasi
    }
  }, []);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white shadow px-6 py-4 flex items-center justify-between relative">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="flex items-center space-x-4" ref={dropdownRef}>
        <span className="text-gray-600">Welcome, {username}</span>
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)}>
            <Image
              src="/batu.jpg"
              alt="Avatar"
              className="w-10 h-10 rounded-full cursor-pointer"
              width={40}
              height={40}
            />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
