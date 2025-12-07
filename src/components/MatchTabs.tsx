import React, { useState } from 'react';
import type { FullMatchResponse } from '../types';

type TabId = 'stats' | 'h2h' | 'standings' | 'injuries';

interface Props {
  data: FullMatchResponse;
}

export const MatchTabs: React.FC<Props> = ({ data }) => {
  const [active, setActive] = useState<TabId>('stats');

  return (
    <div className="card">
      <div className="tabs">
        <button className={`tab ${active === 'stats' ? 'active' : ''}`} onClick={() => setActive('stats')}>
          Stats & Form
        </button>
        <button className={`tab ${active === 'h2h' ? 'active' : ''}`} onClick={() => setActive('h2h')}>
          H2H
        </button>
        <button
          className={`tab ${active === 'standings' ? 'active' : ''}`}
          onClick={() => setActive('standings')}
        >
          Standings
        </button>
        <button
          className={`tab ${active === 'injuries' ? 'active' : ''}`}
          onClick={() => setActive('injuries')}
        >
          Injuries
        </button>
      </div>

      {active === 'stats' && <StatsView data={data} />}
      {active === 'h2h' && <H2HView data={data} />}
      {active === 'standings' && <StandingsView data={data} />}
      {active === 'injuries' && <InjuriesView data={data} />}
    </div>
  );
};

const StatsView: React.FC<{ data: FullMatchResponse }> = ({ data }) => {
  const { stats, form, teams } = data;

  return (
    <div className="grid-2">
      <div>
        <div className="metric-label">{teams.home.name} form</div>
        <div className="metric-value">{form.home || stats.home.form || 'N/A'}</div>
        <ul className="list">
          <li>GF: {stats.home.goals_for ?? '–'}</li>
          <li>GA: {stats.home.goals_against ?? '–'}</li>
          <li>BTTS: {stats.home.btts_rate != null ? `${Math.round(stats.home.btts_rate * 100)}%` : '–'}</li>
          <li>O1.5: {stats.home.over15_rate != null ? `${Math.round(stats.home.over15_rate * 100)}%` : '–'}</li>
          <li>O2.5: {stats.home.over25_rate != null ? `${Math.round(stats.home.over25_rate * 100)}%` : '–'}</li>
          <li>U3.5: {stats.home.under35_rate != null ? `${Math.round(stats.home.under35_rate * 100)}%` : '–'}</li>
        </ul>
      </div>
      <div>
        <div className="metric-label">{teams.away.name} form</div>
        <div className="metric-value">{form.away || stats.away.form || 'N/A'}</div>
        <ul className="list">
          <li>GF: {stats.away.goals_for ?? '–'}</li>
          <li>GA: {stats.away.goals_against ?? '–'}</li>
          <li>BTTS: {stats.away.btts_rate != null ? `${Math.round(stats.away.btts_rate * 100)}%` : '–'}</li>
          <li>O1.5: {stats.away.over15_rate != null ? `${Math.round(stats.away.over15_rate * 100)}%` : '–'}</li>
          <li>O2.5: {stats.away.over25_rate != null ? `${Math.round(stats.away.over25_rate * 100)}%` : '–'}</li>
          <li>U3.5: {stats.away.under35_rate != null ? `${Math.round(stats.away.under35_rate * 100)}%` : '–'}</li>
        </ul>
      </div>
    </div>
  );
};

const H2HView: React.FC<{ data: FullMatchResponse }> = ({ data }) => {
  if (!data.h2h.length) {
    return <p className="subtle">No recent head-to-head data in cache.</p>;
  }
  return (
    <ul className="list">
      {data.h2h.map((m) => (
        <li key={m.date + m.score}>
          {m.date}: {m.score} • Goals: {m.goals} • BTTS: {m.btts ? 'Yes' : 'No'}
        </li>
      ))}
    </ul>
  );
};

const StandingsView: React.FC<{ data: FullMatchResponse }> = ({ data }) => {
  const { standings, teams } = data;
  return (
    <div className="grid-2">
      <div>
        <div className="metric-label">{teams.home.name}</div>
        {standings.home ? (
          <ul className="list">
            <li>Position: {standings.home.position}</li>
            <li>Points: {standings.home.points}</li>
            <li>Goal diff: {standings.home.goal_diff}</li>
          </ul>
        ) : (
          <p className="subtle">No standings data.</p>
        )}
      </div>
      <div>
        <div className="metric-label">{teams.away.name}</div>
        {standings.away ? (
          <ul className="list">
            <li>Position: {standings.away.position}</li>
            <li>Points: {standings.away.points}</li>
            <li>Goal diff: {standings.away.goal_diff}</li>
          </ul>
        ) : (
          <p className="subtle">No standings data.</p>
        )}
      </div>
    </div>
  );
};

const InjuriesView: React.FC<{ data: FullMatchResponse }> = ({ data }) => {
  const { injuries, teams } = data;
  const hasHome = injuries.home.length > 0;
  const hasAway = injuries.away.length > 0;

  if (!hasHome && !hasAway) {
    return <p className="subtle">No injuries or suspensions recorded in cache.</p>;
  }

  return (
    <div className="grid-2">
      <div>
        <div className="metric-label">{teams.home.name}</div>
        {hasHome ? (
          <ul className="list">
            {injuries.home.map((inj) => (
              <li key={inj.player}>
                {inj.player} — {inj.type} ({inj.status})
              </li>
            ))}
          </ul>
        ) : (
          <p className="subtle">No reported issues.</p>
        )}
      </div>
      <div>
        <div className="metric-label">{teams.away.name}</div>
        {hasAway ? (
          <ul className="list">
            {injuries.away.map((inj) => (
              <li key={inj.player}>
                {inj.player} — {inj.type} ({inj.status})
              </li>
            ))}
          </ul>
        ) : (
          <p className="subtle">No reported issues.</p>
        )}
      </div>
    </div>
  );
};
