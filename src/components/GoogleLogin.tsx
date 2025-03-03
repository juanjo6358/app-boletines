import { useEffect, useState } from 'react';
import { getOAuthConfig } from '../lib/db';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleLoginProps {
  onSuccess: (response: any) => void;
  onError?: (error: any) => void;
}

export const GoogleLogin = ({ onSuccess, onError }: GoogleLoginProps) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getOAuthConfig();
        if (config) {
          setClientId(config.clientId);
        } else {
          setError('No hay configuración de OAuth disponible');
          onError?.(new Error('No hay configuración de OAuth disponible'));
        }
      } catch (error) {
        setError('Error al cargar la configuración de OAuth');
        onError?.(error);
      }
    };

    loadConfig();
  }, [onError]);

  useEffect(() => {
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        prompt_parent_id: 'googleButton',
        ux_mode: 'popup',
        context: 'signin',
        select_account: true
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleButton'),
        { 
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'es',
          logo_alignment: 'left'
        }
      );

      window.google.accounts.id.prompt();
    };

    return () => {
      const scriptElement = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (scriptElement && scriptElement.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
    };
  }, [clientId]);

  const handleCredentialResponse = (response: any) => {
    if (response.credential) {
      onSuccess(response);
    } else {
      onError?.(new Error('No se pudo obtener las credenciales'));
    }
  };

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div id="googleButton" className="flex justify-center"></div>
    </div>
  );
}; 