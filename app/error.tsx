'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service if needed
        console.error('Unhandled Application Error:', error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 max-w-md shadow-sm">
                <h2 className="text-2xl font-bold text-red-700 mb-4">Something went wrong!</h2>
                <p className="text-slate-600 mb-6 text-sm">
                    An unexpected error occurred. We've logged the details and are looking into it.
                </p>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => reset()}
                        className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-semibold hover:bg-slate-800 transition-colors"
                    >
                        Try again
                    </button>
                    <a
                        href="/"
                        className="text-slate-500 hover:text-slate-700 text-sm font-medium underline underline-offset-4"
                    >
                        Return Home
                    </a>
                </div>
            </div>
        </div>
    );
}
