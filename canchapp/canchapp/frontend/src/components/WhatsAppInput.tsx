'use client';

import { useState, useEffect } from 'react';
import { isValidPeruvianWhatsApp, normalizePeruvianWhatsApp, displayPeruvianWhatsApp } from '@/lib/whatsapp';

interface WhatsAppInputProps {
  value: string;
  onChange: (raw: string, normalized: string | null, valid: boolean) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Input para WhatsApp peruano. Muestra feedback visual:
 *  - Borde verde si es válido
 *  - Borde rojo si tiene contenido pero es inválido
 *  - Ejemplo del formato esperado debajo
 */
export default function WhatsAppInput({
  value, onChange, required, label = 'WhatsApp', placeholder = '999 999 999', className = '',
}: WhatsAppInputProps) {
  const [touched, setTouched] = useState(false);

  const norm = normalizePeruvianWhatsApp(value);
  const valid = norm !== null;
  const showError = touched && value.length > 0 && !valid;
  const showSuccess = valid && value.length > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const n = normalizePeruvianWhatsApp(raw);
    onChange(raw, n, n !== null);
  }

  // Avisar al padre cuando el value externo cambia
  useEffect(() => {
    onChange(value, norm, valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <label className="label-field flex items-center justify-between">
        <span>{label}</span>
        {showSuccess && (
          <span className="text-pitch-700 text-xs font-mono normal-case tracking-normal">
            ✓ {displayPeruvianWhatsApp(value)}
          </span>
        )}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-ink/40 text-sm pointer-events-none">
          +51
        </span>
        <input
          required={required}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          className={`input-field font-mono pl-12 ${
            showError ? '!border-clay' :
            showSuccess ? '!border-pitch-700' : ''
          }`}
        />
      </div>
      {showError ? (
        <p className="text-clay text-xs mt-1">
          Tiene que ser un celular peruano: 9 dígitos empezando por 9.
        </p>
      ) : (
        <p className="text-ink/50 text-xs mt-1">
          9 dígitos. Ejemplo: 987 654 321
        </p>
      )}
    </div>
  );
}
