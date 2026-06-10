import { Sidebar } from "@/components/platform/sidebar";
import { Topbar } from "@/components/platform/topbar";
import { CommandPalette } from "@/components/platform/command-palette";

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
      <CommandPalette />
    </div>
  );
}
