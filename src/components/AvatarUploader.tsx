import { useEffect, useRef, useState } from 'react';

type Props = {
  initialUrl?: string | null;
  onChange?: (file: File | null) => void;
  label?: string;
  inputId?: string;
};

export default function AvatarUploader({ initialUrl = null, onChange, label, inputId = 'avatar' }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [file, setFile] = useState<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(initialUrl);
    }
  }, [initialUrl, file]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setFile(f);
    if (f) {
      const nextUrl = URL.createObjectURL(f);
      objectUrlRef.current = nextUrl;
      setPreview(nextUrl);
    } else {
      setPreview(initialUrl);
    }
    onChange?.(f);
  }

  function handleRemove() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFile(null);
    setPreview(null);
    onChange?.(null);
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
        {label ? (
          <label htmlFor={inputId} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">
            {label}
          </label>
        ) : null}
        <input id={inputId} type="file" accept="image/*" onChange={handleFile} />
        <div className="mt-2 flex gap-2">
          <button type="button" className="rounded-xl border px-3 py-1 text-xs" onClick={handleRemove}>
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
