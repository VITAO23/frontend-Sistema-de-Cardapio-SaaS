import { useEffect, useState } from 'react';

type Props = {
  initialUrl?: string | null;
  onChange?: (file: File | null) => void;
};

export default function AvatarUploader({ initialUrl = null, onChange }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setPreview(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    onChange?.(file ?? null);
  }, [file, onChange]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : initialUrl);
  }

  function handleRemove() {
    setFile(null);
    setPreview(null);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 overflow-hidden rounded-xl bg-ink-50">
        {preview ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={preview} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">
            Sem avatar
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <input id="avatar" type="file" accept="image/*" onChange={handleFile} />
        <div className="mt-2 flex gap-2">
          <button type="button" className="rounded-xl border px-3 py-1 text-xs" onClick={handleRemove}>
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
