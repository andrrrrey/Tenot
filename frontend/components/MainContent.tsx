export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="main-content" style={{ flex: 1 }}>
      <div className="container">
        {children}
      </div>
    </main>
  );
}
