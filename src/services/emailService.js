class EmailService {
  constructor() {
    this.accounts = [];
  }

  async addAccount(account) {
    // Aquí podríamos implementar la lógica para guardar las cuentas
    // en el almacenamiento local de Electron
    this.accounts.push(account);
    return account;
  }

  async removeAccount(email) {
    this.accounts = this.accounts.filter(account => account.email !== email);
  }

  async sendEmail({ to, subject, body, attachments }) {
    try {
      const result = await window.electronAPI.sendEmail({
        to,
        subject,
        body,
        attachments
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Error al enviar correo:', error);
      throw error;
    }
  }

  async getAccounts() {
    return this.accounts;
  }

  async setDefaultAccount(email) {
    this.accounts = this.accounts.map(account => ({
      ...account,
      isDefault: account.email === email
    }));
  }
}

export default new EmailService(); 