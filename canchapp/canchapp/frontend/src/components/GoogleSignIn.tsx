'use client';

import { useEffect, useRef } from 'react';

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  width?: number;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function GoogleSignIn({
  onCredential,
  text = 'continue_with',
  width = 300,
}: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Ref que SIEMPRE apunta al onCredential más reciente.
  // Así evitamos el problema de "stale closure" cuando el padre cambia su lógica
  // (por ejemplo, cuando el usuario llena los inputs después de mostrar el botón).
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado');
      return;
    }

    async function init() {
      if (!window.google) {
        await loadGoogleScript();
      }
      if (!buttonRef.current || initialized.current) return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: { credential: string }) => {
          if (response.credential) {
            // Llama a la versión más reciente, no a la del primer render
            onCredentialRef.current(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width,
      });
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) {
    return (
      <div className="border-2 border-clay/40 bg-clay/10 p-3 text-xs text-clay">
        Configuración faltante: agrega NEXT_PUBLIC_GOOGLE_CLIENT_ID en frontend/.env.local
      </div>
    );
  }

  return <div ref={buttonRef} />;
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google) return resolve();
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    }
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Sign-In'));
    document.head.appendChild(script);
  });
}