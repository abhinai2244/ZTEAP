import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await validateSession();

  if (!session || !session.isLoggedIn) {
    redirect('/login');
  }

  // Redirect to role-appropriate dashboard
  if (session.roles.includes('SECURITY_ADMIN') || session.roles.includes('SYSTEM_ADMIN')) {
    redirect('/admin');
  } else if (session.roles.includes('RESOURCE_OWNER')) {
    redirect('/owner');
  } else if (session.roles.includes('AUDITOR')) {
    redirect('/auditor');
  } else {
    redirect('/employee');
  }
}
