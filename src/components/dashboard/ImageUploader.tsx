import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  prefix?: string;
  label?: string;
}

export default function ImageUploader({ value, onChange, prefix = "uploads", label = "Image" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-widest text-white/50 block">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="w-16 h-16 object-cover border border-white/10" />
        ) : (
          <div className="w-16 h-16 border border-dashed border-white/10 flex items-center justify-center text-white/20 text-[10px] uppercase tracking-wider">
            None
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-[10px] uppercase tracking-wider px-3 py-1.5 border border-white/20 hover:border-white/40 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-red-400 text-[10px]">{error}</p>}
    </div>
  );
}
