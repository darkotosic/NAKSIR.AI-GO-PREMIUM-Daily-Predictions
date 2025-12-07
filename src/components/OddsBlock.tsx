import React from 'react';
import type { FullMatchResponse } from '../types';

interface Props {
  data: FullMatchResponse;
}

const formatOdd = (odd: number | null | undefined) => (odd ? odd.toFixed(2) : '–');

export const OddsBlock: React.FC<Props> = ({ data }) => {
  const { odds } = data;

  return (
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Market snapshot</h2>
      <p className="subtle" style={{ marginBottom: 12 }}>
        Key pre-match odds used as inputs for value-bet analysis.
      </p>

      <div className="grid-2" style={{ marginBottom: 8 }}>
        <div>
          <div className="metric-label">1X2</div>
          <div className="chip-row">
            <span className="chip">1: {formatOdd(odds['1x2']?.home)}</span>
            <span className="chip">X: {formatOdd(odds['1x2']?.draw)}</span>
            <span className="chip">2: {formatOdd(odds['1x2']?.away)}</span>
          </div>
        </div>
        <div>
          <div className="metric-label">Double Chance</div>
          <div className="chip-row">
            <span className="chip">1X: {formatOdd(odds.double_chance?.['1X'])}</span>
            <span className="chip">X2: {formatOdd(odds.double_chance?.X2)}</span>
            <span className="chip">12: {formatOdd(odds.double_chance?.['12'])}</span>
          </div>
        </div>
        <div>
          <div className="metric-label">Goals</div>
          <div className="chip-row">
            <span className="chip">O1.5: {formatOdd(odds.goals?.over_1_5)}</span>
            <span className="chip">O2.5: {formatOdd(odds.goals?.over_2_5)}</span>
            <span className="chip">U3.5: {formatOdd(odds.goals?.under_3_5)}</span>
          </div>
        </div>
        <div>
          <div className="metric-label">BTTS</div>
          <div className="chip-row">
            <span className="chip">Yes: {formatOdd(odds.btts?.yes)}</span>
            <span className="chip">No: {formatOdd(odds.btts?.no)}</span>
          </div>
        </div>
      </div>

      {odds.correct_score_sample && odds.correct_score_sample.length > 0 && (
        <div>
          <div className="metric-label">Sample Correct Score</div>
          <div className="chip-row">
            {odds.correct_score_sample.map((cs) => (
              <span key={cs.score} className="chip">
                {cs.score}: {formatOdd(cs.odd)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
