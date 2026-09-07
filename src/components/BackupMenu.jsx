import { useRef, useState } from 'react';

export default function BackupMenu({ places, onRestore }) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);

  function handleDownload() {
    const payload = {
      app: 'a-day-out',
      exportedAt: new Date().toISOString(),
      places
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `a-day-out-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const restoredPlaces = Array.isArray(parsed.places) ? parsed.places : Array.isArray(parsed) ? parsed : null;
        if (!restoredPlaces) throw new Error('This file doesn\u2019t look like an A Day Out backup.');

        const confirmed = window.confirm(
          `Restore ${restoredPlaces.length} place${restoredPlaces.length === 1 ? '' : 's'} from this backup? ` +
          'This replaces everything currently saved, on this device and in the cloud.'
        );
        if (confirmed) onRestore(restoredPlaces);
      } catch (err) {
        window.alert('Could not read that file: ' + err.message);
      }
    };
    reader.readAsText(file);
    setOpen(false);
  }

  return (
    <div className="backup-menu">
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen((o) => !o)}>
        Backup
      </button>
      {open && (
        <>
          <div className="backup-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="backup-menu-dropdown">
            <button type="button" onClick={handleDownload}>Download backup</button>
            <button type="button" onClick={handleRestoreClick}>Restore from file</button>
          </div>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
    </div>
  );
}
