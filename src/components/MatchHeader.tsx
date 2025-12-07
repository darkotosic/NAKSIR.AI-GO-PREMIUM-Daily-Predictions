import React from 'react';
import type { FullMatchResponse } from '../types';

interface Props {
  data: FullMatchResponse;
}

export const MatchHeader: React.FC<Props> = ({ data }) => {
  const { fixture, teams } = data;
  const dt = new Date(fixture.date);
  const dateStr = dt.toLocaleString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="card">
      <div className="subtle" style={{ marginBottom: 6 }}>
        {fixture.league.name} • {fixture.league.round || 'League match'}
      </div>
      <div className="row-space" style={{ marginBottom: 8 }}>
        <div>
          <div className="subtle">Fixture #{fixture.id}</div>
          <h2>
            {teams.home.name} <span className="subtle">vs</span> {teams.away.name}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="subtle">{dateStr}</div>
          <div className="badge">Status: {fixture.status}</div>
        </div>
      </div>
      {fixture.venue?.name && (
        <div className="subtle">
          Venue: {fixture.venue.name}
          {fixture.venue.city ? `, ${fixture.venue.city}` : ''}
        </div>
      )}
    </div>
  );
};
