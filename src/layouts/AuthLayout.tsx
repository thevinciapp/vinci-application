import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#111112] text-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-screen pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-[#3ecfff]/[0.03] blur-[100px] rounded-full" />
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-[#D4966A]/[0.03] blur-[80px] rounded-full" />
        <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-[#3ecfff]/[0.02] blur-[110px] rounded-full" />
      </div>
      <div className="relative z-10 w-full max-w-[480px] p-6">
        <Outlet />
      </div>
    </div>
  );
}
