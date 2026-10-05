export const formatBoardDate = (iso: string) => {
  const [, month, day] = iso.split("-").map(Number);
  if (!month || !day) return iso;
  return `${month}월 ${day}일`;
};
