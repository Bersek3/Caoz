// Keep the same robot style and username seed used when accounts are created.
export function getUserAvatar(username: string) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}
