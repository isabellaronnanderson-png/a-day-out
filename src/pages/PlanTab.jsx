import { useState } from 'react';
import { generatePlan } from '../lib/planGenerator';
import { categoryMeta } from '../lib/categories';
import { currencyForCity } from '../lib/currency';

const REASON_COPY = {
  no_city: 'Pick a city to plan in.',
  missing_category: null, // built dynamically
  no_combo: "Nothing fits inside that budget yet — try raising it, or add a few more places."
};

export default function PlanTab({ places, cities }) {
  const [city, setCity] = useState(cities[0] || '');
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [mode, setMode] = useState('any');
  const [budget, setBudget] = useState('');
  const [includeOptionalStop, setIncludeOptionalStop] = useState(true);
  const [result, setResult] = useState(null);

  function handleGenerate() {
    const plan = generatePlan({
      places,
      city,
      timeOfDay,
      budget: budget === '' ? null : Number(budget),
      mode,
      includeOptionalStop
    });
    setResult(plan);
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="section-eyebrow">Today's issue</span>
          <h2>Plan a day out</h2>
        </div>
      </div>

      <div className="panel stack">
        <div className="form-row">
          <div className="field">
            <label htmlFor="planCity">City</label>
            {cities.length > 0 ? (
              <select id="planCity" value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input id="planCity" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Add places first" />
            )}
          </div>

          <div className="field">
            <label>Time of day</label>
            <div className="toggle-pair">
              <button type="button" className={timeOfDay === 'day' ? 'active' : ''} onClick={() => setTimeOfDay('day')}>Day</button>
              <button type="button" className={timeOfDay === 'evening' ? 'active' : ''} onClick={() => setTimeOfDay('evening')}>Evening</button>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Mood</label>
            <div className="toggle-pair">
              <button type="button" className={mode === 'any' ? 'active' : ''} onClick={() => setMode('any')}>Any</button>
              <button type="button" className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>Try new</button>
              <button type="button" className={mode === 'favorites' ? 'active' : ''} onClick={() => setMode('favorites')}>Revisit favorites</button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="budget">Budget (optional, total, {currencyForCity(city)})</label>
            <input
              id="budget"
              type="number"
              min="0"
              placeholder="e.g. 80"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
        </div>

        <label className="hint" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={includeOptionalStop}
            onChange={(e) => setIncludeOptionalStop(e.target.checked)}
          />
          {timeOfDay === 'day' ? 'Try to add a drink after, if it fits' : 'Try to add an activity, if it fits'}
        </label>

        <div>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={!city}>
            Generate plan
          </button>
        </div>
      </div>

      {result && !result.ok && (
        <div className="no-plan-note">
          {result.reason === 'missing_category'
            ? `You need at least one saved place tagged as ${result.missing.map((m) => categoryMeta(m).label).join(' and ')} in ${city} for ${timeOfDay === 'day' ? 'a day' : 'an evening'} plan.`
            : REASON_COPY[result.reason]}
        </div>
      )}

      {result && result.ok && <ItineraryCard plan={result} />}
    </div>
  );
}

function ItineraryCard({ plan }) {
  const currency = currencyForCity(plan.city);
  return (
    <div className="itinerary">
      <div className="itinerary-head">
        <h3>{plan.city} — {plan.timeOfDay === 'day' ? 'day plan' : 'evening plan'}</h3>
        <span className="meta">{plan.stops.length} stops</span>
      </div>
      <div className="itinerary-stops">
        {plan.stops.map((stop, i) => (
          <div className="stop-row" key={i}>
            <div className="stop-slot">{stop.slot}</div>
            <div className="stop-body">
              <div className="stop-name">{stop.place.name}</div>
              <div className="stop-meta">
                {stop.place.address || stop.place.city}
                {stop.place.cost != null && ` · ~${currency}${stop.place.cost}`}
                {plan.closingSoonStops.includes(stop.place.id) && ' · closing soon'}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="itinerary-foot">
        <span>est. total ~{currency}{plan.totalCost}</span>
        <span>
          {plan.hasCoordinates && plan.avgDistanceKm != null
            ? `~${plan.avgDistanceKm.toFixed(1)} km apart, on average`
            : 'add coordinates via place search for proximity matching'}
        </span>
      </div>
    </div>
  );
}
