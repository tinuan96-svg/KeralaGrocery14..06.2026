/**
 * Kichu Assistant Controller
 *
 * Central logic for managing AI persona behavior.
 */

export const GREETINGS = [
  "🙏 Namaskaram!",
  "😊 Welcome back!",
  "🥥 What are we cooking today?",
  "🌴 Looking for Kerala favourites?",
  "🛒 Need help finding something?",
  "🍛 Ask me anything!"
];

export const SMART_SUGGESTIONS: Record<string, string[]> = {
  "Matta Rice": ["Pappadam", "Coconut Oil", "Pickle"],
  "Puttu Podi": ["Kadala Curry", "Banana", "Pappadam"],
  "Tea": ["Banana Chips", "Rusk", "Biscuits"]
};

export function getRandomGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}
