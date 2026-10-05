import { PAY_TYPE_LABEL, type PayType } from "@nuri/shared";
import { parseDay } from "./day";

export type BoardTitleDay = {
  date: string;
  isToday?: boolean;
  isTomorrow?: boolean;
};

export const boardTitle = (day?: BoardTitleDay | null) => {
  if (!day) return "보낼 업체";
  if (day.isToday) return "오늘 보낼 업체";
  if (day.isTomorrow) return "내일 보낼 업체";
  const when = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(parseDay(day.date));
  return `${when}에 보낼 업체`;
};

export const emptyBoardHint = "아래에서 업체를 고른 뒤 등록을 눌러 주세요";

export const composeLabel = (input: {
  dayText?: string;
  company?: string;
  carrier?: string;
  payType: PayType;
  time?: string;
}) => {
  if (!input.dayText) return "보낼 업체 추가";
  return [input.dayText, input.company, input.carrier, PAY_TYPE_LABEL[input.payType], input.time]
    .filter(Boolean)
    .join(" · ");
};
