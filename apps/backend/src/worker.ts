import { ChatbotService } from "./modules/twitch/chatbot.service.js";

async function bootstrap() {
  console.log("Инициализация воркера...");

  const chatbotService = new ChatbotService();
  await chatbotService.start();
}

bootstrap().catch((err) => {
  console.error("Критическая ошибка при запуске воркера:", err);
  process.exit(1);
});
