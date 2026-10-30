'use client';

import { StyledDialog } from './StyledDialog';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CreateTournamentModal } from './CreateTournamentModal';
import { AuthModal } from './AuthModal';

const GlobalAuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode } = useAuth();
  return (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      initialMode={authModalMode}
    />
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pathname = usePathname();

  // El Navbar y Footer de CaozArena solo se muestran dentro de la plataforma de torneos
  const isArenaRoute = pathname.startsWith('/arena') || 
                       pathname.startsWith('/tournament') || 
                       pathname === '/profile' || 
                       pathname === '/join-team' ||
                       pathname === '/privacidad';

  return (
    <AuthProvider>
      <TournamentProvider>
        <div onContextMenu={event => event.preventDefault()} className={`flex flex-col min-h-screen ${isArenaRoute ? "arena-theme" : ""}`}>
          {isArenaRoute && (
            <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />
          )}
          <main className="flex-1">
            {children}
          </main>
          {isArenaRoute && <Footer />}
          <CreateTournamentModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
          <GlobalAuthModal />
          <StyledDialog />
        </div>
      </TournamentProvider>
    </AuthProvider>
  );
};
