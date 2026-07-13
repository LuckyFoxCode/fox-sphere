export const LOTTERY_CONFIG = {
  TICKET_XP_THRESHOLD: 100,
  WINNERS_COUNT: 5,
};

export const LOTTERY_DELAYS = {
  BEFORE_START_ANNOUNCEMENT: 1500,
  ROTATION_PAUSE: 4000,
  NEXT_WINNER_PAUSE: 5500,
  FINAL_PAUSE: 5000,
};

export const LOTTERY_MESSAGES = {
  // Когда зритель набрал нужное количество XP в чате
  TICKET_EARNED: (username: string) =>
    `🎉 @${username} earned enough weekly XP and received a Lottery Ticket! Good luck! 🎫✨`,

  // Одно четкое стартовое сообщение (вместо старых двух на разных языках)
  START_ANNOUNCEMENT:
    "🎰 Weekly Lottery Started! Spinning the Wheel of Fortune on overlay... 🎰",

  // Новые короткие шаблоны для вывода мест в чат
  NEW_WINNER: (place: number, username: string, left: number) =>
    `🎉 Place #${place}: @${username} gets weekly VIP! 🎫 (Left: ${left})`,

  REPEATED_WINNER: (place: number, username: string, left: number) =>
    `🔥 Place #${place}: @${username} extends their VIP status! 🎫 (Left: ${left})`,

  ERROR_ADDING_VIP: (username: string) =>
    `⚠️ Failed to grant VIP to @${username}. The channel might be out of VIP slots!`,

  // Торжественный финал
  FINAL_ANNOUNCEMENT:
    "✨ All VIP statuses successfully distributed! See you next week! ✨",

  // Если за неделю никто не набрал XP на билет
  LOTTERY_POSTPONED_NO_PARTICIPANTS:
    "⚠ No one managed to get a Lottery Ticket this week. The lottery is postponed! 💪",

  NO_PARTICIPANTS_YET:
    "⚠ No one has earned a Lottery Ticket yet this week. Be the first! 💪",

  TOTAL_PARTICIPANTS: (count: number) =>
    `📊 Total VIP ticket holders this week: ${count} users.`,
  ALL_PARTICIPANTS: (usernames: string, count: number) =>
    `🎟️ VIP lottery participants: ${count} people: ${usernames}. ✨ Earn 100 XP before the end of the week!`,
} as const;
