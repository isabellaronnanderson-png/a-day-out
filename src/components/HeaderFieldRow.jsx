import { useEffect, useRef, useState } from 'react';
import { getHeaderPhotos, setHeaderPhoto, clearHeaderPhoto } from '../lib/headerPhotos';

// Default colors shown before a photo is dropped into that slot — four of
// the five palette colors (skipping air-blue, which sits too close to
// columbia-blue to read as a distinct field).
const DEFAULT_COLORS = ['#2e4258', '#8fb37e', '#cde3f3', '#ae9bbd'];
// The pale fields need dark hint text/icons instead of white for contrast.
const HINT_COLORS = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.85)', 'rgba(46,66,88,0.55)', 'rgba(46,66,88,0.55)'];

function DropIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function Field({ slot, color, hintColor, photo, onSetPhoto, onClearPhoto }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(files) {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) onSetPhoto(slot, file);
  }

  return (
    <div
      className={`drop-field ${dragOver ? 'dragover' : ''}`}
      style={{ background: photo ? 'transparent' : color, backgroundImage: photo ? `url(${photo})` : 'none' }}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="field-input"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {!photo && (
        <div className="drop-hint" style={{ color: hintColor }}>
          <DropIcon />
          drop a photo
        </div>
      )}
      {photo && (
        <button
          className="field-clear"
          aria-label="Remove photo"
          onClick={(e) => { e.stopPropagation(); onClearPhoto(slot); }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export default function HeaderFieldRow() {
  const [photos, setPhotos] = useState([null, null, null, null]);

  useEffect(() => {
    getHeaderPhotos().then(setPhotos).catch(() => {});
  }, []);

  async function handleSetPhoto(slot, file) {
    // Optimistic preview while the compressed version is being stored.
    const previewUrl = URL.createObjectURL(file);
    setPhotos((p) => p.map((existing, i) => (i === slot ? previewUrl : existing)));
    try {
      const dataUrl = await setHeaderPhoto(slot, file);
      setPhotos((p) => p.map((existing, i) => (i === slot ? dataUrl : existing)));
    } catch (err) {
      console.error('Could not save header photo', err);
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function handleClearPhoto(slot) {
    setPhotos((p) => p.map((existing, i) => (i === slot ? null : existing)));
    await clearHeaderPhoto(slot).catch(() => {});
  }

  return (
    <div className="field-row">
      {DEFAULT_COLORS.map((color, i) => (
        <Field
          key={i}
          slot={i}
          color={color}
          hintColor={HINT_COLORS[i]}
          photo={photos[i]}
          onSetPhoto={handleSetPhoto}
          onClearPhoto={handleClearPhoto}
        />
      ))}
    </div>
  );
}
