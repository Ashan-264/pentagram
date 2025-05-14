import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pentagram",
  description: "AI Image Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-[#0a0a23] to-[#1a1a2e] text-white`}
        >
          <SignedOut>
            <div
              className="flex items-center justify-center min-h-screen bg-cover bg-center"
              style={{ backgroundImage: "url('/starry..jpg')" }}
            >
              <div className="bg-white/20 bg-gradient-to-r from-green-400 to-blue-600 p-10 rounded-xl shadow-xl text-center">
                <h1 className="text-5xl font-bold text-gradient">Pixagram</h1>

                <div className="mt-6">
                  <SignInButton />
                </div>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="mt-4">
              <UserButton />
            </div>
            {children}
          </SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}
