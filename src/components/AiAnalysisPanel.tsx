import React from 'react';
import type { AiAnalysisResponse } from '../types';

interface Props {
  data: AiAnalysisResponse | null;
  loading: boolean;
  onAnalyze: () => void;
  onAsk: (question: string) => void;
}

export const AiAnalysisPanel: React.FC<Props> = ({ data, loading, onAnalyze, onAsk }) => {
  const [question, setQuestion] = React.useState('');

  const handleAsk = () => {
    if (!question.trim()) return;
    onAsk(question.trim());
    setQuestion('');
  };

  return (
    <div className="card">
      <div className="row-space" style={{ marginBottom: 12 }}>
        <div>
          <h2>AI Match Analysis & Value Bets</h2>
          <p className="subtle">
            Deep analysis over real stats • focus on DC+Goals, CS Top 2 and BTTS YES probability.
          </p>
        </div>
        <button className="button" onClick={onAnalyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Run AI analysis'}
        </button>
      </div>

      {data ? (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Summary</h3>
          <p style={{ fontSize: '0.9rem', marginTop: 0 }}>{data.summary}</p>

          {data.key_factors.length > 0 && (
            <>
              <h3 style={{ marginBottom: 4 }}>Key factors</h3>
              <ul className="list">
                {data.key_factors.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </>
          )}

          {data.value_bets.length > 0 && (
            <>
              <h3 style={{ marginBottom: 4 }}>Value bets</h3>
              <ul className="list">
                {data.value_bets.map((vb, idx) => (
                  <li key={idx}>
                    <strong>{vb.market} — {vb.selection}</strong>
                    {` @ ${vb.bookmaker_odd.toFixed(2)} • model ${Math.round(vb.model_probability * 100)}% • edge ${Math.round(vb.edge * 100)}pp`}
                    {vb.comment ? ` — ${vb.comment}` : ''}
                  </li>
                ))}
              </ul>
            </>
          )}

          {data.risk_flags.length > 0 && (
            <>
              <h3 style={{ marginBottom: 4 }}>Risk flags</h3>
              <ul className="list">
                {data.risk_flags.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </>
          )}

          <p className="subtle" style={{ marginTop: 8 }}>
            {data.disclaimer}
          </p>
        </div>
      ) : (
        <p className="subtle">
          Run the analysis to generate probabilities and value-bet suggestions based on the cached match data.
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="metric-label" style={{ marginBottom: 4 }}>
          Follow-up question (optional)
        </div>
        <textarea
          placeholder="Npr. Fokusiraj se samo na BTTS i DC+goals za ovaj meč."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <button className="button" onClick={handleAsk} disabled={loading || !question.trim()}>
            Ask AI about this match
          </button>
        </div>
      </div>
    </div>
  );
};
