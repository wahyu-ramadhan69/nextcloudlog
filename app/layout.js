"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en">
      <body className="bg-gray-100">
        {isLoginPage ? (
          <div className="w-full min-h-screen flex items-center justify-center">
            <AnimatePresence mode="wait" initial={false}>
              <div key={pathname}>{children}</div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-col flex-1">
              <Header />
              <main className="p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <div key={pathname}>{children}</div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
