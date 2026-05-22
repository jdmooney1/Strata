import { Sidebar } from "@/components/platform/sidebar";
import { Topbar } from "@/components/platform/topbar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="platform-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}
