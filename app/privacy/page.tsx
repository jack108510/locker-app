import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#08090d] px-6 py-8 text-slate-300">
      <Link href="../" className="text-sm text-cyan-300">← Back to Locker</Link>
      <h1 className="mt-8 text-4xl font-semibold tracking-[-0.06em] text-white">Privacy Policy</h1>
      <p className="mt-3 text-sm leading-6 text-slate-500">Last updated: August 12, 2026</p>

      <section className="mt-8 space-y-6 text-sm leading-7 text-slate-400">
        <p>
          Locker is a school-specific database where students can scan old assignments, quizzes,
          exams, worksheets, and answer-filled copies so students from the same school can search past material for test prep.
        </p>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Alias or handle you choose.</li>
            <li>Selected school, course, teacher/class labels, material title, and material type.</li>
            <li>Photos/scans you choose to submit.</li>
            <li>OCR text extracted from submitted images for search and moderation.</li>
            <li>Reports, votes, and limited device identifiers used to prevent duplicate voting.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">How we use it</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>To show approved material only to students using the same school feed.</li>
            <li>To make scanned text searchable by topic, class, teacher, and material type.</li>
            <li>To review reports and remove prohibited or unsafe content.</li>
            <li>To keep current tests, teacher-only keys, grades, names, and private information out of the app.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Photos and camera</h2>
          <p>
            Locker only accesses the camera or photo library when you choose to scan or pick a photo. We do not read your photo library in the background.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Public visibility</h2>
          <p>
            Approved submissions may be visible to users in the same school feed. Do not upload personal information, grades, student names, or any material you do not have permission to share.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-white">Removal</h2>
          <p>
            Users can report material in the app. Reported material is reviewed and may be removed or blocked. To request removal, email support@locker.school with the school, title, and reason.
          </p>
        </div>
      </section>
    </main>
  );
}
