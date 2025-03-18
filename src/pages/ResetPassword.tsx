import { Link } from 'react-router-dom';

export default function ResetPassword() {
  return (
    <div className="flex flex-col w-full">
      <h1>Reset Password Page</h1>
      <Link to="/protected">Back to Protected</Link>
    </div>
  );
}