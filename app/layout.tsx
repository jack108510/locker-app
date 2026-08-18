import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locker — Your school's assignment database",
  description: "A school-specific study archive where students scan assignments, quizzes, worksheets, and past exams.",
  keywords: ["assignments", "past exams", "old quizzes", "school archive", "study database", "crowdsourced"],
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
