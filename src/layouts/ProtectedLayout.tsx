import { Outlet } from 'react-router-dom';

export default function ProtectedLayout() {
  return (
    <div className="min-h-screen w-full bg-[#111112] text-white">
      <div className="w-full h-full">
        <Outlet />
      </div>
    </div>
  );
}
