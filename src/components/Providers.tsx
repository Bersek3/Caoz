'use client';

import { StyledDialog } from './StyledDialog';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '../context/AuthContext';
import { TournamentProvider } from '../context/TournamentContext';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CreateTournamentModal } from './CreateTournamentModal';
import { ArenaLoader } from './ArenaLoader';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const pathname = usePathname();
  const isAccountRoute = pathname.startsWith('/account/');

  // El Navbar y Footer de CaozArena solo se muestran dentro de la plataforma de torneos
  const isArenaRoute = pathname.startsWith('/arena') || 
                       pathname.startsWith('/tournament') || 
                       pathname === '/profile' || 
                       pathname === '/join-team' ||
                       pathname === '/privacidad';

  const content = <div className={`flex flex-col min-h-screen ${isArenaRoute || isAccountRoute ? "arena-theme" : ""}`}>
    {isArenaRoute && !isAccountRoute && <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />}
    <main className="flex-1">{children}</main>
    {isArenaRoute && !isAccountRoute && <Footer />}
    {!isAccountRoute && <CreateTournamentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />}
    <StyledDialog />
  </div>;
  const app = isAccountRoute ? content : <TournamentProvider>{content}</TournamentProvider>;

  return (
    <AuthProvider>
      {(isArenaRoute || isAccountRoute) && <ArenaLoader />}
      {app}
    </AuthProvider>
  );
};
