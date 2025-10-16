import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ModernLayout from '../components/layout/ModernLayout';
import Office365Integration from '../components/integrations/Office365Integration';

export default function Integrations() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) {
      router.push('/');
      return;
    }
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <ModernLayout user={user} onLogout={handleLogout}>
      <Office365Integration />
    </ModernLayout>
  );
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}