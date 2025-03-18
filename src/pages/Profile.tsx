import { Link } from 'react-router-dom';

export default function Profile() {
  return (
    <div className="flex flex-col w-full">
      <h1>Profile Page</h1>
      <Link to="/protected">Back to Protected</Link>
    </div>
  );
}