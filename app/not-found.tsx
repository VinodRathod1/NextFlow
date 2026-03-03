import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="bg-white border border-slate-100 rounded-2xl p-8 max-w-md shadow-sm">
                <span className="text-4xl mb-4 block">🔍</span>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h2>
                <p className="text-slate-500 mb-8 text-sm">
                    Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
                </p>
                <Link
                    href="/"
                    className="inline-block bg-slate-900 text-white rounded-lg px-8 py-2.5 font-semibold hover:bg-slate-800 transition-colors"
                >
                    Go Back Home
                </Link>
            </div>
        </div>
    );
}
