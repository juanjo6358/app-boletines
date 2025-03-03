import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getEmailConfigs } from '../src/lib/db/email';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Importar las credenciales directamente del archivo .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentamos el límite para PDFs grandes

// Definición de tipos
interface Attachment {
  filename: string;
  content: string | Buffer;
  encoding?: string;
  contentType?: string;
}

interface EmailRequestBody {
  to: string[];
  subject: string;
  html: string;
  attachments?: Attachment[];
}

// Configuración para crear un transportador de correo
const createTransporter = async () => {
  try {
    // Primero intentamos obtener configuración de la base de datos
    const emailConfigs = await getEmailConfigs();
    const defaultConfig = emailConfigs.find(config => config.isDefault);
    
    if (defaultConfig) {
      if (defaultConfig.authType === 'password') {
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: defaultConfig.email,
            pass: defaultConfig.password || process.env.GMAIL_APP_PASSWORD
          }
        });
      } else if (defaultConfig.authType === 'oauth') {
        // Si es OAuth, necesitamos credenciales OAuth
        if (!defaultConfig.oauthCredentials) {
          throw new Error('Faltan credenciales OAuth');
        }
        
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: defaultConfig.email,
            accessToken: defaultConfig.oauthCredentials.accessToken,
            refreshToken: defaultConfig.oauthCredentials.refreshToken,
            clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
            clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET
          }
        });
      }
    }
    
    // Si no hay configuración en la base de datos, usar variables de entorno
    const user = process.env.GMAIL_USER;
    const password = process.env.GMAIL_APP_PASSWORD;
    
    if (!user || !password) {
      throw new Error('Falta configuración de correo en las variables de entorno');
    }
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass: password
      }
    });
  } catch (error) {
    console.error('Error al crear transportador:', error);
    throw error;
  }
};

// Función para manejar el envío de correos
const handleSendEmail = async (req: any, res: any) => {
  try {
    const { to, subject, html, attachments } = req.body as EmailRequestBody;
    
    if (!to || !Array.isArray(to) || to.length === 0) {
      return res.status(400).json({ error: 'Se requieren destinatarios' });
    }
    
    if (!subject) {
      return res.status(400).json({ error: 'Se requiere un asunto' });
    }
    
    if (!html) {
      return res.status(400).json({ error: 'Se requiere contenido del correo' });
    }
    
    // Procesar los adjuntos: decodificar base64 si es necesario
    const processedAttachments = attachments?.map((attachment: Attachment) => {
      if (attachment.content && typeof attachment.content === 'string' && attachment.encoding === 'base64') {
        return {
          ...attachment,
          content: Buffer.from(attachment.content, 'base64')
        };
      }
      return attachment;
    });
    
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to.join(', '),
      subject,
      html,
      attachments: processedAttachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado:', info.messageId);
    
    res.json({ message: 'Correo enviado correctamente', messageId: info.messageId });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    res.status(500).json({ 
      error: 'Error al enviar correo', 
      message: error instanceof Error ? error.message : 'Error desconocido' 
    });
  }
};

// Definir rutas
// @ts-ignore - Ignoramos el error de tipado de Express
app.post('/api/send-email', handleSendEmail);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
}); 