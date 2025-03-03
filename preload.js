const { contextBridge, ipcRenderer } = require('electron');

// Exponer funciones seguras al proceso de renderizado
contextBridge.exposeInMainWorld('electron', {
  // Función para enviar correos electrónicos
  sendEmail: (emailData) => ipcRenderer.invoke('send-email', emailData),
  // Obtener variables de entorno
  getEnvVars: () => ipcRenderer.invoke('get-env-vars'),
});

// Las variables de entorno se obtendrán a través de IPC
contextBridge.exposeInMainWorld('env', {
  getEnvVars: () => ipcRenderer.invoke('get-env-vars')
}); 