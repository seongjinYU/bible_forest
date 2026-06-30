import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import TransitionShell from "@/components/TransitionShell";
import { ThemeProvider } from "@/context/ThemeContext";
import { BgmProvider } from "@/context/BgmContext";
import { getSessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase";
import { THEMES } from "@/constants/themes";
import type { ThemeKey } from "@/constants/themes";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "팀 숲 성경읽기",
  description: "함께 심고 함께 자라는 팀 숲 성경읽기 챌린지",
  icons: { icon: "/assets/forest/9.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let theme: ThemeKey = "forest";

  const user = await getSessionUser();
  if (user) {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("teams")
      .select("theme")
      .eq("id", user.team_id)
      .single();
    const raw = (data as { theme?: string | null } | null)?.theme;
    if (raw && raw in THEMES) theme = raw as ThemeKey;
  }

  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full`}>
      <body className="h-full">
        <div className="w-full h-full bg-white flex flex-col relative overflow-hidden" style={{ overscrollBehavior: "none" }}>
          <ThemeProvider theme={theme}>
            <BgmProvider theme={theme}>
              <TransitionShell>{children}</TransitionShell>
            </BgmProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
