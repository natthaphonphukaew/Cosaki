import BottomNav from './BottomNav';

export default function AppShell({ children }) {
  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[390px] bg-surface-base">
      <main className="safe-top safe-bottom pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
