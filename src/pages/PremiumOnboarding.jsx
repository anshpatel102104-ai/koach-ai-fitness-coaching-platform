import { Navigate, useLocation } from 'react-router-dom';

// Legacy /start entry. Account creation lives at /signup; pricing lives on the
// marketing site. Query params (plan, interval) are carried over.
export default function PremiumOnboarding() {
  const { search } = useLocation();
  return <Navigate to={`/signup${search}`} replace />;
}
