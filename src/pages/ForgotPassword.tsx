import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div className="flex flex-col w-full">
      <h1>Forgot Password Page</h1>
      <Link to="/sign-in">Back to Sign in</Link>
    </div>
  );
}