import type { Metadata } from "next";
import "./globals.css";
import "./features.css";

export const metadata: Metadata = {
  title: "윤건언어 | 함께 만들어가는 새로운 언어",
  description: "새로운 단어를 제안하고 윤건언어의 소식을 확인하세요.",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
