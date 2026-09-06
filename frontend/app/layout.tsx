import './globals.css';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans-next' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-next' });

export const metadata: Metadata = {
  title: 'THE LAST WEBSITE',
  description: 'Claim your permanent spot on the Internet',
  icons: {
    icon: [{ url: '/icon-v3.png', type: 'image/png' }],
    apple: [{ url: '/icon-v3.png', type: 'image/png' }],
    shortcut: '/icon-v3.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${mono.variable}`}>{children}</body>
    </html>
  );
}
