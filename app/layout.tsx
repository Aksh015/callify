import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Callify | Hotel Voice AI',
  description: 'AI Voice Receptionist for the Hospitality Sector',
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
