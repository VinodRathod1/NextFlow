import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #c5dff0 0%, #deeaf4 30%, #e8eff5 50%, #d4dde6 80%, #b8c5d1 100%)',
            }}
        >
            {/* Cloud-like decorative blurs */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[10%] left-[5%] w-[300px] h-[150px] bg-white/40 rounded-full blur-[80px]" />
                <div className="absolute top-[5%] right-[10%] w-[400px] h-[200px] bg-white/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[15%] left-[20%] w-[350px] h-[120px] bg-white/30 rounded-full blur-[90px]" />
                <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[150px] bg-white/35 rounded-full blur-[80px]" />
            </div>

            {/* Brand Logo */}
            <div className="absolute top-6 left-8 flex items-center gap-2 z-10">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                </div>
                <span className="text-slate-800 font-bold text-sm tracking-tight">NextFlow</span>
            </div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-sm mx-4">
                <div
                    className="rounded-2xl px-6 py-5 shadow-xl"
                    style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(240,244,248,0.9) 50%, rgba(220,230,240,0.85) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.5)',
                    }}
                >
                    {/* Icon + Title compact */}
                    <div className="flex flex-col items-center mb-3">
                        <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm mb-3">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="22" y1="11" x2="16" y2="11" />
                            </svg>
                        </div>
                        <h1 className="text-slate-900 text-base font-bold text-center">Create your account</h1>
                        <p className="text-slate-500 text-xs text-center mt-0.5">
                            Get started with NextFlow — it&apos;s completely free.
                        </p>
                    </div>

                    {/* Clerk SignUp */}
                    <SignUp
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                cardBox: "w-full shadow-none",
                                card: "bg-transparent shadow-none p-0 w-full gap-2",
                                headerTitle: "hidden",
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton:
                                    "bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 transition-all duration-200 shadow-sm",
                                socialButtonsBlockButtonText: "text-slate-700 font-medium text-sm",
                                dividerLine: "bg-gray-200",
                                dividerText: "text-slate-400 text-xs",
                                formFieldLabel: "text-slate-600 text-xs",
                                formFieldInput:
                                    "bg-white border-gray-200 text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:ring-slate-200 rounded-lg shadow-sm text-sm py-2",
                                formFieldRow: "mb-1",
                                formButtonPrimary:
                                    "bg-gradient-to-b from-slate-700 to-slate-900 text-white hover:from-slate-600 hover:to-slate-800 font-semibold transition-all duration-200 shadow-md rounded-lg text-sm",
                                footerActionLink: "text-slate-700 hover:text-slate-900 font-medium text-sm",
                                footerActionText: "text-slate-400 text-sm",
                                identityPreviewText: "text-slate-900",
                                identityPreviewEditButton: "text-slate-500 hover:text-slate-700",
                                formFieldAction: "text-slate-500 hover:text-slate-700 text-xs",
                                alert: "bg-red-50 border-red-200 text-red-600",
                                footer: "bg-transparent pt-2",
                                formFieldInputShowPasswordButton: "text-slate-400 hover:text-slate-600",
                            },
                            layout: {
                                socialButtonsPlacement: "bottom",
                                socialButtonsVariant: "iconButton",
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
