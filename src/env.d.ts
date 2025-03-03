interface Window {
  env: {
    VITE_TURSO_DB_URL: string;
    VITE_TURSO_DB_AUTH_TOKEN: string;
    VITE_API_URL: string;
    VITE_FRONTEND_URL: string;
  };
  electronAPI: {
    sendEmail: (data: {
      to: string;
      subject: string;
      body: string;
      attachments?: any[];
    }) => Promise<{ success: boolean; error?: string }>;
  };
} 