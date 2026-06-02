declare module '*.css';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData?: string;
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
