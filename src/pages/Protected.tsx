import { Link } from 'react-router-dom';

export default function Protected() {
  return (
    <div className="flex flex-col w-full">
      <h1>Protected Page</h1>
      <Link to="/protected/profile">Profile</Link>
      <Link to="/protected/reset-password">Reset Password</Link>
    </div>
  );
}