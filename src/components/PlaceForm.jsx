import { useEffect, useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories';
import { searchPlaces } from '../lib/placesApi';
import { currencyForCity } from '../lib/currency';
import { addPhoto, deletePhoto, getPhotos } from '../lib/photoStore';
import { getAllTags } from '../lib/storage';

const emptyForm = {
  name: '',
  city: '',
  address: '',
  categories: ['breakfast'],
  tags: [],
  cost: '',
  notes: '',
  exhibitionEndDate: '',
  lat: null,
  lng: null,
  googlePlaceId: null,
  openingHours: null
};

export default function PlaceForm({ cities, defaultCity, place, onSave, onClose }) {
  const isEditing = Boolean(place);
  const [form, setForm] = useState(() =>
    isEditing ? { ...emptyForm, ...place } : { ...emptyForm, city: defaultCity || '' }
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchNote, setSearchNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const allTags = useRef(getAllTags()).current; // snapshot at open time is fine for suggestions
  const debounceRef = useRef(null);

  // Photos: existing (already persisted, for edit mode) + pending (picked
  // but not uploaded until the place itself is saved).
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]); // { file, previewUrl }

  useEffect(() => {
    if (isEditing) {
      getPhotos(place.id).then(setExistingPhotos).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchPlaces(query, form.city);
        setResults(found);
        setSearchNote(found.length === 0 ? 'No matches — you can still enter this place manually below.' : '');
      } catch (err) {
        setSearchNote('Place search isn\u2019t available right now — enter details manually below.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function selectResult(r) {
    setForm((f) => ({
      ...f,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      googlePlaceId: r.googlePlaceId,
      openingHours: r.openingHours || null
    }));
    setQuery('');
    setResults([]);
  }

  function toggleCategory(value) {
    setForm((f) => {
      const has = f.categories.includes(value);
      const categories = has ? f.categories.filter((c) => c !== value) : [...f.categories, value];
      return { ...f, categories };
    });
  }

  function addTag(raw) {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    setForm((f) => (f.tags.includes(tag) ? f : { ...f, tags: [...f.tags, tag] }));
    setTagInput('');
  }

  function removeTag(tag) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    const withPreviews = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPendingPhotos((p) => [...p, ...withPreviews]);
    e.target.value = ''; // allow re-selecting the same file later
  }

  function removePendingPhoto(index) {
    setPendingPhotos((p) => {
      URL.revokeObjectURL(p[index].previewUrl);
      return p.filter((_, i) => i !== index);
    });
  }

  async function removeExistingPhoto(photoId) {
    await deletePhoto(photoId);
    setExistingPhotos((p) => p.filter((ph) => ph.id !== photoId));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || form.categories.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        cost: form.cost === '' ? null : Number(form.cost)
      };
      if (isEditing) payload.id = place.id;

      const saved = onSave(payload);
      const placeId = saved?.id || place?.id;

      if (placeId && pendingPhotos.length > 0) {
        await Promise.all(pendingPhotos.map((p) => addPhoto(placeId, p.file)));
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const showExhibitionField = form.categories.some((c) => c.startsWith('activity'));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEditing ? 'Edit place' : 'Add a place'}</h3>
          <button className="close-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="stack" onSubmit={submit}>
          {!isEditing && (
            <div className="field autocomplete-wrap">
              <label htmlFor="search">Search (optional)</label>
              <input
                id="search"
                placeholder="Start typing a place name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {searching && <div className="hint">Searching…</div>}
              {searchNote && <div className="hint">{searchNote}</div>}
              {results.length > 0 && (
                <div className="autocomplete-list">
                  {results.map((r) => (
                    <div key={r.googlePlaceId} className="autocomplete-item" onClick={() => selectResult(r)}>
                      <strong>{r.name}</strong>
                      <div className="hint">{r.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                required
                list="city-list"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <datalist id="city-list">
                {cities.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="field">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Category (pick as many as fit)</label>
            <div className="cat-toggle-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`cat-toggle ${form.categories.includes(c.value) ? 'active' : ''}`}
                  style={{ '--pill-color': `var(${c.cssVar})`, '--kicker-text': c.textColor }}
                  onClick={() => toggleCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {form.categories.length === 0 && <div className="hint">Pick at least one category.</div>}
          </div>

          <div className="field">
            <label htmlFor="tagInput">Tags (your own — press Enter to add)</label>
            <input
              id="tagInput"
              list="tag-suggestions"
              placeholder="e.g. daytrip, date night, with kids"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => addTag(tagInput)}
            />
            <datalist id="tag-suggestions">
              {allTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            {form.tags.length > 0 && (
              <div className="tag-chip-row">
                {form.tags.map((t) => (
                  <span className="tag-chip" key={t}>
                    #{t}
                    <button type="button" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="cost">Approx. cost ({currencyForCity(form.city)})</label>
            <input
              id="cost"
              type="number"
              min="0"
              placeholder="e.g. 25"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
          </div>

          {showExhibitionField && (
            <div className="field">
              <label htmlFor="exhibitionEnd">On view through (optional, for exhibitions)</label>
              <input
                id="exhibitionEnd"
                type="date"
                value={form.exhibitionEndDate}
                onChange={(e) => setForm((f) => ({ ...f, exhibitionEndDate: e.target.value }))}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="photos">Photos</label>
            <input id="photos" type="file" accept="image/*" multiple onChange={handleFilesSelected} />
            {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
              <div className="photo-edit-strip">
                {existingPhotos.map((p) => (
                  <div className="photo-edit-thumb" key={p.id}>
                    <img src={p.dataUrl} alt="" />
                    <button type="button" onClick={() => removeExistingPhoto(p.id)} aria-label="Remove photo">×</button>
                  </div>
                ))}
                {pendingPhotos.map((p, i) => (
                  <div className="photo-edit-thumb pending" key={p.previewUrl}>
                    <img src={p.previewUrl} alt="" />
                    <button type="button" onClick={() => removePendingPhoto(i)} aria-label="Remove photo">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ticket-actions">
            <button type="submit" className="btn btn-primary" disabled={form.categories.length === 0 || saving}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save place'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
