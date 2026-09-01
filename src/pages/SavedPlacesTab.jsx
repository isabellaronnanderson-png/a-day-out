import { useMemo, useState } from 'react';
import PlaceCard from '../components/PlaceCard';
import PlaceForm from '../components/PlaceForm';
import { CATEGORIES } from '../lib/categories';
import { getAllTags } from '../lib/storage';

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function SavedPlacesTab({ places, cities, onAdd, onUpdate, onToggleFavorite, onToggleVisited, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [cityFilters, setCityFilters] = useState(new Set());
  const [categoryFilters, setCategoryFilters] = useState(new Set());
  const [tagFilters, setTagFilters] = useState(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const allTags = useMemo(() => getAllTags(), [places]);

  const filtered = useMemo(() => {
    return places.filter((p) => {
      if (cityFilters.size > 0 && !cityFilters.has(p.city)) return false;
      if (categoryFilters.size > 0 && !(p.categories || []).some((c) => categoryFilters.has(c))) return false;
      if (tagFilters.size > 0 && !(p.tags || []).some((t) => tagFilters.has(t))) return false;
      if (favoritesOnly && !p.favorite) return false;
      return true;
    });
  }, [places, cityFilters, categoryFilters, tagFilters, favoritesOnly]);

  const formOpen = showForm || editingPlace != null;

  function closeForm() {
    setShowForm(false);
    setEditingPlace(null);
  }

  const singleCity = cityFilters.size === 1 ? [...cityFilters][0] : '';

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="section-eyebrow">The collection</span>
          <h2>Saved places</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add a place</button>
      </div>

      <div className="panel filter-panel">
        {cities.length > 0 && (
          <div className="filter-group">
            <label>City</label>
            <div className="cat-toggle-row">
              {cities.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`filter-pill ${cityFilters.has(c) ? 'active' : ''}`}
                  onClick={() => setCityFilters((s) => toggleInSet(s, c))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="filter-group">
          <label>Category</label>
          <div className="cat-toggle-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`cat-toggle ${categoryFilters.has(c.value) ? 'active' : ''}`}
                style={{ '--pill-color': `var(${c.cssVar})`, '--kicker-text': c.textColor }}
                onClick={() => setCategoryFilters((s) => toggleInSet(s, c.value))}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="filter-group">
            <label>Tag</label>
            <div className="cat-toggle-row">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tag-toggle ${tagFilters.has(t) ? 'active' : ''}`}
                  onClick={() => setTagFilters((s) => toggleInSet(s, t))}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          className={`btn btn-sm ${favoritesOnly ? '' : 'btn-ghost'}`}
          onClick={() => setFavoritesOnly((v) => !v)}
        >
          {favoritesOnly ? '♥ favorites only' : '♡ show favorites only'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Add a breakfast spot, an exhibition, a bar — anything you'd want on a perfect day out.</p>
        </div>
      ) : (
        <div className="ticket-grid">
          {filtered.map((p) => (
            <PlaceCard
              key={p.id}
              place={p}
              onToggleFavorite={onToggleFavorite}
              onToggleVisited={onToggleVisited}
              onDelete={onDelete}
              onEdit={() => setEditingPlace(p)}
              onTagClick={(t) => setTagFilters((s) => toggleInSet(s, t))}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <PlaceForm
          cities={cities}
          defaultCity={singleCity}
          place={editingPlace}
          onClose={closeForm}
          onSave={(payload) => (payload.id ? onUpdate(payload.id, payload) : onAdd(payload))}
        />
      )}
    </div>
  );
}
