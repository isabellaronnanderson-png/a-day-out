import CategoryStamp from './CategoryStamp';
import PhotoGallery from './PhotoGallery';
import { isClosingSoon, daysUntil } from '../lib/planGenerator';
import { categoryMeta } from '../lib/categories';
import { currencyForCity } from '../lib/currency';
import { isOpenNow, hasHoursData } from '../lib/hours';

export default function PlaceCard({ place, onToggleFavorite, onToggleVisited, onDelete, onEdit, onTagClick }) {
  const closing = isClosingSoon(place);
  const daysLeft = daysUntil(place.exhibitionEndDate);
  const categories = place.categories || [];
  const tags = place.tags || [];
  const primaryMeta = categoryMeta(categories[0]);
  const currency = currencyForCity(place.city);
  const openNow = hasHoursData(place) ? isOpenNow(place) : null;

  return (
    <div className="place-card" style={{ '--accent-card': `var(${primaryMeta.cssVar})` }}>
      {closing && <div className="closing-pill">closing in {daysLeft}d</div>}

      <div className="place-card-top">
        <div>
          <div className="cat-kicker-row">
            {categories.map((cat) => (
              <CategoryStamp key={cat} category={cat} />
            ))}
          </div>
          <div className="place-name">{place.name}</div>
          <div className="place-meta">
            <span>{place.city}</span>
            {place.cost != null && place.cost !== '' && <span>· ~{currency}{place.cost}</span>}
            {openNow != null && <span>· {openNow ? 'open now' : 'closed now'}</span>}
          </div>
        </div>
        <button
          className={`fav-btn ${place.favorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite(place.id)}
          title={place.favorite ? 'Remove from favorites' : 'Mark as favorite'}
          aria-label="Toggle favorite"
        >
          {place.favorite ? '♥' : '♡'}
        </button>
      </div>

      {place.exhibitionEndDate && (
        <div className="place-meta" style={{ marginTop: 8 }}>
          on view through {place.exhibitionEndDate}
        </div>
      )}

      {place.notes && <div className="place-notes">{place.notes}</div>}

      {tags.length > 0 && (
        <div className="tag-chip-row" style={{ marginTop: 10 }}>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              className="tag-chip tag-chip-clickable"
              onClick={() => onTagClick?.(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <PhotoGallery placeId={place.id} />

      <div className="place-actions">
        <button
          className={`btn btn-sm ${place.visited ? '' : 'btn-ghost'}`}
          onClick={() => onToggleVisited(place.id)}
        >
          {place.visited ? '✓ been there' : 'mark visited'}
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onEdit}>
          edit
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => onDelete(place.id)}>
          remove
        </button>
      </div>
    </div>
  );
}
