import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Locker — Past quizzes and exams from students near you.",
  description: "A crowdsourced school database where students scan old assignments, quizzes, and exams so anyone who signs up can search real past test material.",
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
