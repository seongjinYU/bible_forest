import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "팀 숲 성경읽기",
  description: "함께 심고 함께 자라는 팀 숲 성경읽기 챌린지",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full`}>
      <body className="min-h-full bg-gray-100 flex flex-col items-center">
        <div className="w-full max-w-[390px] min-h-dvh bg-white flex flex-col relative overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
