import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
      <h2 className="text-4xl font-extrabold text-indigo-400 mb-2">404</h2>
      <p className="text-slate-400 mb-6">Security Perimeter: Requested resource not found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold text-white transition-colors"
      >
        Return to Portal
      </Link>
    </div>
  );
}
