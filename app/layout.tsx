import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ORBIT / 07 — Anti-gravity racing',
  description:
    'Race the edge of orbit. A procedural Three.js arcade racer with neon circuits, anti-gravity ships and three-lap competition.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
