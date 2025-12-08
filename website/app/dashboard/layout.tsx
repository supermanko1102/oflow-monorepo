export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 主要內容區域 - 為底部導航預留空間 */}
      <main className="mx-auto max-w-lg pb-20">{children}</main>
    </div>
  );
}
