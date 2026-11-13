import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#ededf0] flex items-center justify-center p-6">
      <div className="bg-[#111113] border border-[#26262b] border-t-2 border-t-[#6D4AFF] rounded-lg p-5 max-w-md w-full text-center space-y-4 py-8">
        <h2 className="text-xl font-semibold text-[#ededf0]">Page not found</h2>
        <p className="text-sm text-[#8b8b94]">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center font-medium rounded-md bg-[#6D4AFF] text-white hover:bg-[#5b36ed] px-3.5 py-1.5 text-xs h-8 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
