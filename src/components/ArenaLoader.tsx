'use client';

import { useEffect, useState } from 'react';

export function ArenaLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="arena-loader"
      role="status"
      aria-label="Cargando CZ Arena"
    >
      <div className="arena-loader__content">
        <img
          src="/assets/cz-arena-loader.png"
          alt="CZ Arena"
          className="arena-loader__logo"
        />
        <p className="arena-loader__powered">
          Powered by <span>Pyro Producciones</span>
        </p>
      </div>
    </div>
  );
}
