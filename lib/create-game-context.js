'use client';

import { createContext, useContext, useState } from 'react';

const CreateGameContext = createContext(null);

export function CreateGameProvider({ children }) {
  const [isCreateGameModalOpen, setIsCreateGameModalOpen] = useState(false);

  function openCreateGameModal() {
    setIsCreateGameModalOpen(true);
  }

  function closeCreateGameModal() {
    setIsCreateGameModalOpen(false);
  }

  return (
    <CreateGameContext.Provider
      value={{
        isCreateGameModalOpen,
        openCreateGameModal,
        closeCreateGameModal,
      }}
    >
      {children}
    </CreateGameContext.Provider>
  );
}

export function useCreateGameModal() {
  const ctx = useContext(CreateGameContext);
  if (!ctx) {
    throw new Error('useCreateGameModal must be used within CreateGameProvider');
  }
  return ctx;
}
