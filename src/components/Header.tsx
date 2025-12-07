import React from 'react';
import { APP_TITLE } from '../constants';

export const Header: React.FC = () => {
  return (
    <header className="card" style={{ marginBottom: 16 }}>
      <div className="row-space">
        <div>
          <h1>{APP_TITLE}</h1>
          <p className="subtle">
            Single-match intelligence screen • DC+Goals • CS Top 2 • BTTS value detection
          </p>
        </div>
        <span className="badge">GO PREMIUM</span>
      </div>
    </header>
  );
};
