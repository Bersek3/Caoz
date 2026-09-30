'use client';

import React, { useState } from 'react';
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

  return (
    <AuthProvider>
      <TournamentProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar onOpenCreateModal={() => setIsCreateModalOpen(true)} />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <CreateTournamentModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
          <GlobalAuthModal />
        </div>
      </TournamentProvider>
    </AuthProvider>
  );
};
