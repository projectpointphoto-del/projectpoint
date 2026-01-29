import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PROJECTPOINT PHOTO',
  description: 'Volume Photography Registration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
