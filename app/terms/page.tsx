import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#08090d] px-6 py-8 text-slate-300">
      <Link href="../" className="text-sm text-cyan-300">← Back to Locker</Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-[-0.06em] text-white">Terms & Content Policy</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Last updated: August 12, 2026</p>

      <section className="mt-8 space-y-6 text-sm leading-7 text-slate-400">
        <p>
          Locker is for test preparation using old school material. It is not for posting active exams, private teacher material, personal information, harassment, or anything illegal.
        </p>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Allowed</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Old assignments and completed assignment copies.</li>
            <li>Old quizzes and quiz copies with answers.</li>
            <li>Old exams and exam copies with answers.</li>
            <li>Worksheets, practice tests, and review packets from past classes.</li>
            <li>Class, course, teacher, and topic labels that help students find relevant material.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Not allowed</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Current or still-active tests, quizzes, exams, or assignments.</li>
            <li>Teacher-only answer keys, teacher editions, or private staff documents.</li>
            <li>Student names, faces, grades, IDs, emails, rosters, or personal information.</li>
            <li>Copyrighted material that you do not have permission to share.</li>
            <li>Threats, bullying, explicit content, spam, or impersonation.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Moderation</h2>
          <p>
            Locker may queue, block, or remove material at any time. Reports are reviewed for policy violations. Repeated abuse can lead to removal of your submissions or blocking of your alias/device from participating.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Academic integrity</h2>
          <p>
            Locker is intended for preparation with past material. Users are responsible for following their school&apos;s rules and only using Locker in allowed ways.
          </p>
        </div>
      </section>
    </main>
  );
}
