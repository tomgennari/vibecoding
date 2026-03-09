'use client';

import { useRouter } from 'next/navigation';
import { useCreateGameModal } from '@/lib/create-game-context.js';
import { useUser } from '@/lib/user-context.js';

const TABS = [
  { id: 'juegos-dia', label: 'Juegos', icon: '🎮', href: '/dashboard' },
  { id: 'ranking-houses', label: 'Ranking', icon: '🏆', href: '/dashboard' },
  { id: 'crear-juego', label: 'Crear', icon: '🕹️', href: '/juegos/subir' },
  { id: 'progreso-campus', label: 'Campus', icon: '🏗', href: '/dashboard' },
  { id: 'perfil', label: 'Perfil', icon: '👤', href: '/perfil' },
];

export function MobileBottomNav({ theme, activeTabId, onTabChange }) {
  const router = useRouter();
  const { openCreateGameModal } = useCreateGameModal();
  const { userHouseMeta } = useUser();
  const isDark = theme === 'dark';
  const cardBg = isDark ? '#13131a' : '#f8fafc';
  const border = isDark ? '#2a2a3a' : '#e2e8f0';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const houseColor = userHouseMeta?.color ?? textMuted;

  function handleTabClick(tab) {
    if (tab.id === 'crear-juego') {
      openCreateGameModal();
      return;
    }
    if (tab.id === 'perfil') {
      router.push(tab.href);
      return;
    }
    if (typeof onTabChange === 'function') {
      onTabChange(tab.id);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t h-[60px]"
      style={{ background: cardBg, borderColor: border }}
    >
      {TABS.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-w-0 transition-colors"
            style={{
              color: isActive ? houseColor : textMuted,
              fontWeight: isActive ? 700 : 500,
            }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] truncate w-full">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
