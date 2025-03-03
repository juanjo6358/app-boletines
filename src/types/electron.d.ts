// Declaración de tipos para la integración con Electron
interface ElectronAPI {
  sendEmail: (emailData: any) => Promise<any>;
}

interface EnvVariables {
  VITE_TURSO_DB_URL: string;
  VITE_TURSO_DB_AUTH_TOKEN: string;
  VITE_API_URL: string;
  VITE_FRONTEND_URL: string;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
    env?: EnvVariables;
  }
}

export {}; 