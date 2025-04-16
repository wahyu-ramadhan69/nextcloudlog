"use client";
import "./globals.css";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex flex-col flex-1">
          <Header />
          <main className="p-6">
            <AnimatePresence mode="wait" initial={false}>
              <div key={pathname}>{children}</div>
            </AnimatePresence>
          </main>
        </div>
      </body>
    </html>
  );
}
