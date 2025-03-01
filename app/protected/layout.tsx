export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full w-full">
        {children}
    </div>
  );
}
