import type { ReactNode } from "react";
import "../globals.css";

export const metadata = {
  title: "公司訂餐系統",
  description: "友成幸福團隊公司訂餐系統",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
