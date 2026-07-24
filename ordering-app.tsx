import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.GITHUB_ACTIONS === "true"
  ? "/company-food-ordering"
  : "";

export const metadata: Metadata = {
  title: "公司訂餐系統",
  description: "友成幸福團隊公司訂餐系統",
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
