import type { Metadata } from "next";
import "./globals.css";

// Force dynamic rendering for the entire app to prevent stale cached content
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Audience Survey - Snap your survey → instant insights",
  description: "Collect and analyze audience feedback during speaking sessions using Azure AI Content Understanding. Upload survey photos for instant analysis.",
  keywords: ["survey", "feedback", "azure", "ai", "presentation", "analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
