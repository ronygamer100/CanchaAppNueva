'use client';

import { useEffect, useRef, useState } from 'react';

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  width?: number;
  disabled?: boolean;
  onError?: (message: string) => void;
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
  disabled = false,
  onError,
}: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Ref que SIEMPRE apunta al onCredential más reciente.
  // Así evitamos el problema de "stale closure" cuando el padre cambia su lógica
  // (por ejemplo, cuando el usuario llena los inputs después de mostrar el botón).
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!CLIENT_ID) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado');
      return;
    }

    let cancelled = false;

    async function init() {
      setStatus('loading');
      try {
        if (!window.google) await loadGoogleScript();
        if (cancelled || !buttonRef.current) return;
        if (initialized.current) {
          setStatus('ready');
          return;
        }

        buttonRef.current.replaceChildren();
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            } else {
              onErrorRef.current?.('Google no devolvió una credencial. Intenta nuevamente.');
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
        initialized.current = true;
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        initialized.current = false;
        const message = error instanceof Error
          ? error.message
          : 'No se pudo iniciar Google Sign-In';
        setStatus('error');
        onErrorRef.current?.(message);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [attempt, text, width]);

  if (!CLIENT_ID) {
    return (
      <div className="rounded-lg border border-clay/30 bg-clay/10 p-4 text-sm text-clay">
        Configuración faltante: agrega NEXT_PUBLIC_GOOGLE_CLIENT_ID en frontend/.env.local
      </div>
    );
  }

  return (
    <div>
      <div
        ref={buttonRef}
        aria-busy={status === 'loading' || disabled}
        className={disabled ? 'pointer-events-none opacity-60' : undefined}
      />
      {status === 'loading' && (
        <p className="mt-2 text-xs text-ink/60">Cargando acceso con Google…</p>
      )}
      {status === 'error' && (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-clay underline"
          onClick={() => {
            initialized.current = false;
            setAttempt((value) => value + 1);
          }}
        >
          No se pudo cargar Google. Reintentar
        </button>
      )}
    </div>
  );
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
      if (error) reject(error);
      else resolve();
    };
    const handleLoad = () => finish(
      window.google ? undefined : new Error('Google Sign-In cargó de forma incompleta'),
    );
    const handleError = () => finish(new Error('No se pudo cargar Google Sign-In'));
    const timeout = window.setTimeout(
      () => finish(new Error('Google Sign-In tardó demasiado en cargar')),
      8_000,
    );

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (window.google) finish();
  }).catch((error) => {
    googleScriptPromise = null;
    if (!window.google) {
      document.querySelector('script[src="https://accounts.google.com/gsi/client"]')?.remove();
    }
    throw error;
  });

  return googleScriptPromise;
}
