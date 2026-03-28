'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client.js';
import { ADMIN_THEME } from './constants.js';
import AdminNavbar from './components/AdminNavbar.js';
import AdminSidebar from './components/AdminSidebar.js';
import AdminGamesSection from './components/AdminGamesSection.js';
import AdminDailyGamesSection from './components/AdminDailyGamesSection.js';
import AdminUsersSection from './components/AdminUsersSection.js';
import AdminEngagementSection from './components/AdminEngagementSection.js';
import AdminFinanzasSection from './components/AdminFinanzasSection.js';
import AdminAndySection from './components/AdminAndySection.js';

export default function AdminPage() {
  const router = useRouter();
  const [section, setSection] = useState('juegos');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/dashboard');
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      console.log('Admin check — profile:', profile, 'error:', error);
      if (!profile || !profile.is_admin) {
        router.push('/dashboard');
        return;
      }
      setProfile(profile);
      setLoading(false);
    }
    check();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: ADMIN_THEME.bg, color: ADMIN_THEME.textMuted }}>
        Cargando...
      </div>
    );
  }

  const adminName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Admin' : 'Admin';

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: ADMIN_THEME.bg, color: ADMIN_THEME.text }}>
      <AdminNavbar adminName={adminName} onLogout={handleLogout} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AdminSidebar section={section} onSectionChange={setSection} />
        <main className="flex-1 overflow-auto min-w-0" style={{ background: ADMIN_THEME.bg }}>
          {section === 'juegos' && <AdminGamesSection />}
          {section === 'juegos-dia' && <AdminDailyGamesSection />}
          {section === 'usuarios' && <AdminUsersSection />}
          {section === 'engagement' && <AdminEngagementSection />}
          {section === 'finanzas' && <AdminFinanzasSection />}
          {section === 'andy' && <AdminAndySection />}
        </main>
      </div>
    </div>
  );
}
