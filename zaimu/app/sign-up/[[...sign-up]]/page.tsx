import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="flex items-center justify-center size-10 rounded-md font-bold text-lg select-none"
            style={{ background: "var(--color-navy-900)", color: "white" }}
          >
            Z
          </div>
          <div>
            <p className="text-xl font-semibold tracking-wide" style={{ color: "var(--color-navy-900)" }}>
              ZAIMU
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Asset Ownership Operating System
            </p>
          </div>
        </div>
        <SignUp />
      </div>
    </div>
  );
}
