export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="container main-content" style={{ flex: 1 }}>
      {children}
    </main>
  );
}
