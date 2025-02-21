export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-[#3ecfff]/[0.015] blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-[#D4966A]/[0.015] blur-[100px] rounded-full" />
        <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-[#3ecfff]/[0.01] blur-[130px] rounded-full" />
      </div>
      <div className="relative z-10 w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
