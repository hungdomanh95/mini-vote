import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Vote",
  description: "Tạo poll nhỏ và ghi nhận vote bằng Next.js + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
