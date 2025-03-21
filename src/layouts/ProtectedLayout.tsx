import { Outlet } from 'react-router-dom';

export default function ProtectedLayout() {
  return (
    <div className="h-full w-full">
      <Outlet />
    </div>
  );
}
