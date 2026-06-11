'use client';

import { AMENITIES } from '@/lib/amenities';

interface AmenitiesPickerProps {
  selected: string[];
  onChange: (slugs: string[]) => void;
}

export default function AmenitiesPicker({ selected, onChange }: AmenitiesPickerProps) {
  function toggle(slug: string) {
    const has = selected.includes(slug);
    onChange(has ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  return (
    <div className="border-2 border-ink/20 p-5">
      <p className="eyebrow mb-3">¿Qué ofrece tu local?</p>
      <p className="text-sm text-ink/70 mb-4">
        Marca todo lo que tengas disponible para los jugadores. Esto se mostrará en tu página pública.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {AMENITIES.map((a) => {
          const on = selected.includes(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => toggle(a.slug)}
              className={`border-2 p-3 text-left transition-all flex flex-col gap-2 ${
                on
                  ? 'border-ink bg-pitch-400 shadow-brut'
                  : 'border-ink/20 hover:border-ink bg-cream'
              }`}
            >
              <div className={`w-7 h-7 ${on ? 'text-ink' : 'text-ink/70'}`}>
                {a.icon}
              </div>
              <span className="text-sm font-medium leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
