import { useState } from 'react';

interface OAuthLoginProps {
  onSuccess: (credentials: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    email: string;
  }) => void;
  onError: (error: Error) => void;
}

export function OAuthLogin({ onSuccess, onError }: OAuthLoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Abre una ventana popup para el login de Google
      const popup = window.open(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        'Google Login',
        'width=500,height=600'
      );

      // Escucha el mensaje de la ventana popup
      window.addEventListener('message', async (event) => {
        if (event.origin !== import.meta.env.VITE_API_URL) return;
        
        if (event.data.type === 'oauth-success') {
          const { tokens, email } = event.data;
          onSuccess({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            email
          });
          popup?.close();
        } else if (event.data.type === 'oauth-error') {
          onError(new Error(event.data.error));
          popup?.close();
        }
      });
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
    >
      {isLoading ? (
        <div className="mr-2 w-4 h-4 border-2 border-gray-300 rounded-full animate-spin border-t-gray-600" />
      ) : (
        <img src="/google-icon.svg" alt="Google" className="mr-2 w-4 h-4" />
      )}
      Iniciar sesión con Google
    </button>
  );
} 