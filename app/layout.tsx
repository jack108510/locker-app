import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locker — Your school test bank",
  description: "A school-specific test-prep database where students scan old assignments, quizzes, exams, and answer-filled copies.",
  keywords: ["past exams", "old quizzes", "assignments", "test bank", "school", "crowdsourced"],
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
