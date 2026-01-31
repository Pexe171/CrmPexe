export type Locale = "pt-BR";

export const DEFAULT_LOCALE: Locale = "pt-BR";

const messages: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    "auth.login.brand": "CrmPexe",
    "auth.login.title": "Entrar",
    "auth.login.subtitle": "Acesse seu workspace para continuar o atendimento.",
    "auth.login.email": "E-mail",
    "auth.login.emailPlaceholder": "voce@empresa.com",
    "auth.login.code": "Código recebido",
    "auth.login.codePlaceholder": "123456",
    "auth.login.request": "Enviar código",
    "auth.login.requestLoading": "Enviando código...",
    "auth.login.verify": "Entrar",
    "auth.login.verifyLoading": "Validando código...",
    "auth.login.change": "Trocar e-mail ou reenviar código",
    "auth.register.brand": "CrmPexe",
    "auth.register.title": "Criar conta",
    "auth.register.subtitle": "Crie seu acesso e comece a usar o CRM.",
    "auth.register.name": "Nome completo",
    "auth.register.namePlaceholder": "Seu nome completo",
    "auth.register.email": "E-mail",
    "auth.register.emailConfirmation": "Confirme o e-mail",
    "auth.register.emailPlaceholder": "voce@empresa.com",
    "auth.register.contact": "Contato (WhatsApp)",
    "auth.register.contactPlaceholder": "(00) 00000-0000",
    "auth.register.submit": "Criar conta",
    "auth.register.submitLoading": "Criando conta...",
    "auth.register.change": "Alterar dados ou reenviar código"
  }
};

export const getMessage = (key: string, locale: Locale = DEFAULT_LOCALE) => {
  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE]?.[key] ?? key;
};
