import React from 'react';
import { Header } from './components/Header';
import { MatchHeader } from './components/MatchHeader';
import { OddsBlock } from './components/OddsBlock';
import { MatchTabs } from './components/MatchTabs';
import { AiAnalysisPanel } from './components/AiAnalysisPanel';
import { fetchAiAnalysis, fetchFullMatch } from './services/backend';
import type { FullMatchResponse, AiAnalysisResponse } from './types';

const App: React.FC = () => {
  const [fixtureId, setFixtureId] = React.useState('');
  const [matchData, setMatchData] = React.useState<FullMatchResponse | null>(null);
  const [aiData, setAiData] = React.useState<AiAnalysisResponse | null>(null);
  const [loadingMatch, setLoadingMatch] = React.useState(false);
  const [loadingAi, setLoadingAi] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoadMatch = async () => {
    if (!fixtureId.trim()) return;
    setLoadingMatch(true);
    setError(null);
    setAiData(null);
    try {
      const data = await fetchFullMatch(fixtureId.trim());
      setMatchData(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load match.');
      setMatchData(null);
    } finally {
      setLoadingMatch(false);
    }
  };

  const runAiAnalysis = async (question?: string) => {
    if (!matchData) return;
    setLoadingAi(true);
    setError(null);
    try {
      const res = await fetchAiAnalysis(String(matchData.fixture.id), question);
      setAiData(res);
    } catch (e: any) {
      setError(e.message || 'Failed to run AI analysis.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-space" style={{ marginBottom: 10 }}>
          <div>
            <h2>Load match by fixture_id</h2>
            <p className="subtle">
              Uses backend endpoint <code>/matches/{{fixture_id}}/full</code> backed by API-FOOTBALL cache.
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input
            className="input"
            placeholder="Enter fixture_id (e.g. 123456)"
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
          />
          <button className="button" onClick={handleLoadMatch} disabled={loadingMatch || !fixtureId.trim()}>
            {loadingMatch ? 'Loading…' : 'Load match'}
          </button>
        </div>
        {error && (
          <p className="subtle" style={{ color: '#fca5a5', marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>

      {matchData && (
        <>
          <MatchHeader data={matchData} />
          <OddsBlock data={matchData} />
          <MatchTabs data={matchData} />
          <AiAnalysisPanel
            data={aiData}
            loading={loadingAi}
            onAnalyze={() => runAiAnalysis()}
            onAsk={(q) => runAiAnalysis(q)}
          />
        </>
      )}
    </div>
  );
};

export default App;
