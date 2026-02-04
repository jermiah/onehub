import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "OneHub",
  description: 'AI-powered chat with persistent memory and RAG',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(0 0% 9%)',
              border: '1px solid hsl(0 0% 20%)',
              color: 'hsl(0 0% 95%)',
            },
          }}
        />
      </body>
    </html>
  );
}
