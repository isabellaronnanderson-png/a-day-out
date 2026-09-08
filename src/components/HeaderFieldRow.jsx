import { useEffect, useRef, useState } from 'react';
import { getHeaderPhotos, setHeaderPhoto, setHeaderPosition, clearHeaderPhoto } from '../lib/headerPhotos';

// Default colors shown before a photo is dropped into that slot — four of
// the five palette colors (skipping air-blue, which sits too close to
// columbia-blue to read as a distinct field).
const DEFAULT_COLORS = ['#2e4258', '#8fb37e', '#cde3f3', '#ae9bbd'];
// The pale fields need dark hint text/icons instead of white for contrast.
const HINT_COLORS = ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.85)', 'rgba(46,66,88,0.55)', 'rgba(46,66,88,0.55)'];

// How far beyond a plain "cover" fit each photo is zoomed by default, so
// the natural edges of an uploaded photo (sky, awkward crop lines, etc.)
// sit safely outside the visible frame. Dragging still works within this
// zoomed frame to pick which part shows.
const ZOOM = 1.18;
const DRAG_THRESHOLD = 4; // px — below this, a pointerdown+up counts as a click, not a drag

function DropIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function Field({ slot, color, hintColor, photo, onSetPhoto, onSetPosition, onClearPhoto }) {
  const [dragOver, setDragOver] = useState(false);
  const [pos, setPos] = useState({ x: photo?.posX ?? 50, y: photo?.posY ?? 50 });
  const [isPanning, setIsPanning] = useState(false);
  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  const dragState = useRef(null);

  // Keep local pan position in sync if the stored photo changes (e.g. a new upload).
  useEffect(() => {
    setPos({ x: photo?.posX ?? 50, y: photo?.posY ?? 50 });
  }, [photo?.dataUrl]);

  function handleFiles(files) {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) onSetPhoto(slot, file);
  }

  function handlePointerDown(e) {
    if (!photo) return; // no photo yet — plain click opens the file picker instead
    if (e.target.closest('.field-clear')) return; // let the clear button handle its own click normally
    const rect = fieldRef.current.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      rectW: rect.width,
      rectH: rect.height,
      moved: false
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    setIsPanning(true);
    // Dragging right should reveal more of the photo's left side, so the
    // image should appear to follow the cursor — invert the delta when
    // mapping to object-position.
    const nextX = clamp(d.startPosX - (dx / d.rectW) * 100, 0, 100);
    const nextY = clamp(d.startPosY - (dy / d.rectH) * 100, 0, 100);
    setPos({ x: nextX, y: nextY });
  }

  function handlePointerUp() {
    const d = dragState.current;
    dragState.current = null;
    setIsPanning(false);
    if (d?.moved) {
      onSetPosition(slot, pos.x, pos.y);
    }
  }

  function handleClick() {
    if (!photo) inputRef.current?.click();
  }

  return (
    <div
      ref={fieldRef}
      className={`drop-field ${dragOver ? 'dragover' : ''} ${photo ? 'has-photo' : ''} ${isPanning ? 'panning' : ''}`}
      style={{ background: photo ? '#000' : color }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
      {photo && (
        <img
          src={photo.dataUrl}
          alt=""
          className="field-photo"
          draggable={false}
          style={{ objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${ZOOM})` }}
        />
      )}
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export default function HeaderFieldRow() {
  const [photos, setPhotos] = useState([null, null, null, null]);

  useEffect(() => {
    getHeaderPhotos().then(setPhotos).catch(() => {});
  }, []);

  async function handleSetPhoto(slot, file) {
    // Optimistic preview while the compressed version is being stored.
    const previewUrl = URL.createObjectURL(file);
    setPhotos((p) => p.map((existing, i) => (i === slot ? { dataUrl: previewUrl, posX: 50, posY: 50 } : existing)));
    try {
      const record = await setHeaderPhoto(slot, file);
      setPhotos((p) => p.map((existing, i) => (i === slot ? { dataUrl: record.dataUrl, posX: record.posX, posY: record.posY } : existing)));
    } catch (err) {
      console.error('Could not save header photo', err);
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  }

  function handleSetPosition(slot, posX, posY) {
    setPhotos((p) => p.map((existing, i) => (i === slot && existing ? { ...existing, posX, posY } : existing)));
    setHeaderPosition(slot, posX, posY).catch(() => {});
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
          onSetPosition={handleSetPosition}
          onClearPhoto={handleClearPhoto}
        />
      ))}
    </div>
  );
}
