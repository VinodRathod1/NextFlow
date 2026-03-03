import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from 'next/font/google';
import { validateAllEnv } from '@/lib/env';
import './globals.css';
import 'reactflow/dist/style.css';

// Run environment validation at startup
validateAllEnv();

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'NextFlow Workflow Builder',
  description: 'Production-ready Next.js 14 project using the App Router',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} min-h-screen h-full antialiased bg-slate-50 text-slate-900`}>
          <div className="mx-auto min-h-screen flex flex-col">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
