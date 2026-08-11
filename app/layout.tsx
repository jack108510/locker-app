import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locker — Your school's study stash.",
  description: "Anonymous study material sharing for your school. Notes, guides, flashcards — all reviewed before they're visible.",
  keywords: ["study", "school", "notes", "flashcards", "anonymous", "study guide"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0b14] text-[#e2e4f3] antialiased">
        {children}
      </body>
    </html>
  );
}
