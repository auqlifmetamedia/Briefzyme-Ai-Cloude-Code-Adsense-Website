import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uploadImageFile } from '../../utils/imageUpload.ts';

interface Props {
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}

// Tombol "unggah dari perangkat": pilih gambar -> dikompres -> disimpan -> URL dikembalikan.
export const ImageUploadButton: React.FC<Props> = ({ onUploaded, label = 'Upload image', className }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onUploaded(await uploadImageFile(file));
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={
          className ||
          'px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer'
        }
      >
        <Upload className="w-3 h-3" />
        <span>{busy ? 'Uploading…' : label}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handle} />
      {error && <span className="text-[10px] text-rose-600 mt-1 max-w-[220px]">{error}</span>}
    </span>
  );
};
