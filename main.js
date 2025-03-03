const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');

// Verificar si estamos en desarrollo
const isDev = process.env.VITE_DEV_SERVER_URL ? true : false;

// Cargar variables de entorno al inicio
const envPath = isDev 
  ? path.join(__dirname, '.env')
  : path.join(process.resourcesPath, '.env');

dotenv.config({ path: envPath });

// Manejar la obtención de variables de entorno
ipcMain.handle('get-env-vars', () => {
  return {
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    GMAIL_OAUTH_CLIENT_ID: process.env.GMAIL_OAUTH_CLIENT_ID,
    GMAIL_OAUTH_CLIENT_SECRET: process.env.GMAIL_OAUTH_CLIENT_SECRET,
    GMAIL_OAUTH_REFRESH_TOKEN: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
    // Añade aquí otras variables de entorno que necesites
  };
});

// Mantener una referencia global del objeto window para evitar que se cierre automáticamente
let mainWindow;
let expressServer;

// Crear el menú de la aplicación
function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // Menú de la aplicación (solo en macOS)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: 'Acerca de Boletines de Notas' },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar Boletines de Notas' },
        { role: 'hideOthers', label: 'Ocultar Otros' },
        { role: 'unhide', label: 'Mostrar Todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir de Boletines de Notas' }
      ]
    }] : []),
    
    // Menú Archivo
    {
      label: 'Archivo',
      submenu: [
        isMac ? { role: 'close', label: 'Cerrar Ventana' } : { role: 'quit', label: 'Salir' }
      ]
    },
    
    // Menú Editar
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle', label: 'Pegar y Mantener Estilo' },
          { role: 'delete', label: 'Eliminar' },
          { role: 'selectAll', label: 'Seleccionar Todo' },
        ] : [
          { role: 'delete', label: 'Eliminar' },
          { type: 'separator' },
          { role: 'selectAll', label: 'Seleccionar Todo' }
        ])
      ]
    },
    
    // Menú Ver
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla Completa' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Tamaño Real' },
        { role: 'zoomIn', label: 'Aumentar' },
        { role: 'zoomOut', label: 'Reducir' }
      ]
    },
    
    // Menú Ventana
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: 'Traer Todo al Frente' },
        ] : [
          { role: 'close', label: 'Cerrar' }
        ])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Iniciar el servidor Express
function startExpressServer() {
  const expressApp = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  expressApp.use(cors());
  expressApp.use(express.json({ limit: '10mb' }));

  // Endpoint para enviar correos
  expressApp.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, html, attachments } = req.body;
      
      // Validar datos
      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: 'Se requieren destinatarios' });
      }
      
      if (!subject) {
        return res.status(400).json({ error: 'Se requiere un asunto' });
      }
      
      if (!html) {
        return res.status(400).json({ error: 'Se requiere contenido del correo' });
      }
      
      // Procesar los adjuntos si es necesario
      const processedAttachments = attachments?.map(attachment => {
        if (attachment.content && typeof attachment.content === 'string' && attachment.encoding === 'base64') {
          return {
            ...attachment,
            content: Buffer.from(attachment.content, 'base64')
          };
        }
        return attachment;
      });
      
      // Crear transportador
      const transporter = createTransporter();
      
      // Configurar opciones del correo
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: to.join(', '),
        subject,
        html,
        attachments: processedAttachments
      };
      
      // Enviar correo
      const info = await transporter.sendMail(mailOptions);
      console.log('Correo enviado (Express):', info.messageId);
      
      res.json({ message: 'Correo enviado correctamente', messageId: info.messageId });
    } catch (error) {
      console.error('Error al enviar correo (Express):', error);
      res.status(500).json({ 
        error: 'Error al enviar correo', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      });
    }
  });

  // Iniciar el servidor
  expressServer = expressApp.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
  });
}

async function createWindow() {
  // Iniciar el servidor Express
  startExpressServer();

  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1200,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Configurar el manejo de la redirección de origen para OAuth
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.googleapis.com/*', 'https://*.google.com/*'] },
    (details, callback) => {
      details.requestHeaders['Origin'] = 'http://localhost';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Cargar la URL de desarrollo o el archivo HTML de producción
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Solo mostrar DevTools en desarrollo si es necesario para debugging
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Configurar eventos de depuración
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error al cargar la página:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Página cargada completamente');
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log('Mensaje de consola:', message);
  });

  // Crear y establecer el menú
  createMenu();
}

// Crear la ventana cuando la aplicación esté lista
app.whenReady().then(createWindow);

// Salir cuando todas las ventanas estén cerradas, excepto en macOS
app.on('window-all-closed', () => {
  // Cerrar el servidor Express si está en ejecución
  if (expressServer) {
    expressServer.close();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // En macOS, recrear la ventana cuando se haga clic en el icono del dock
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Función para crear un transportador de correo
const createTransporter = () => {
  console.log('Creando transporter para envío de correos...');
  
  // Verificar que tenemos las credenciales necesarias
  if (!process.env.GMAIL_USER) {
    console.error('Error: No se ha configurado GMAIL_USER en el archivo .env');
    return null;
  }
  
  // Verificar si estamos usando OAuth o contraseña de aplicación
  if (process.env.GMAIL_OAUTH_CLIENT_ID && process.env.GMAIL_OAUTH_CLIENT_SECRET && process.env.GMAIL_OAUTH_REFRESH_TOKEN) {
    console.log('Usando autenticación OAuth2 para Gmail');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN
      }
    });
  } else if (process.env.GMAIL_APP_PASSWORD) {
    console.log('Usando contraseña de aplicación para Gmail');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  } else {
    console.error('Error: No se ha configurado ni OAuth ni contraseña de aplicación para Gmail');
    return null;
  }
};

// Mejorar el manejo de eventos IPC para envío de correos
ipcMain.handle('send-email', async (event, emailData) => {
  try {
    console.log('Recibida solicitud para enviar correo electrónico');
    
    // Validar datos requeridos
    if (!emailData.to || !emailData.subject || !emailData.html) {
      console.error('Error: Faltan datos requeridos para el correo', emailData);
      return { success: false, error: 'Faltan datos requeridos para el correo' };
    }
    
    // Crear transporter
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, error: 'No se pudo crear el transporter para envío de correos' };
    }
    
    // Procesar los adjuntos
    const processedAttachments = emailData.attachments?.map(attachment => {
      if (attachment.content && typeof attachment.content === 'string') {
        // Convertir el contenido base64 a Buffer
        return {
          filename: attachment.filename,
          content: Buffer.from(attachment.content, 'base64'),
          contentType: 'application/pdf',
          encoding: 'base64'
        };
      }
      return attachment;
    }) || [];
    
    // Preparar opciones de correo con mejor soporte para HTML
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: Array.isArray(emailData.to) ? emailData.to.join(',') : emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.html.replace(/<[^>]*>/g, ''),
      attachments: processedAttachments
    };
    
    console.log('Enviando correo a:', mailOptions.to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado correctamente:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return { 
      success: false, 
      error: error.message,
      details: error.response || 'Sin detalles adicionales'
    };
  }
}); 