import { redirect } from 'next/navigation';

/** Redirect /login to /auth for backward compatibility */
export default function LoginRedirect() {
  redirect('/auth');
}
