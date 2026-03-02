'use client';

import { ADMIN_SECTIONS, ADMIN_THEME } from '../constants.js';

export default function AdminSidebar({ section, onSectionChange }) {
  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto"
      style={{ background: ADMIN_THEME.card, borderColor: ADMIN_THEME.border }}
    >
      <nav className="p-2 space-y-0.5">
        {ADMIN_SECTIONS.map((s) => {
          const isActive = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSectionChange(s.id)}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors min-w-0"
              style={{
                background: isActive ? `${ADMIN_THEME.accent}20` : 'transparent',
                color: isActive ? ADMIN_THEME.text : ADMIN_THEME.textMuted,
                border: isActive ? `1px solid ${ADMIN_THEME.accent}` : '1px solid transparent',
              }}
            >
              <span className="text-lg">{s.icon}</span>
              <span className="text-sm font-medium truncate">{s.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
