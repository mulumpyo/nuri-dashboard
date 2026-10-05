import { menuTravelMs } from "../router/motion";

export const pillTravelMs = (snap: boolean, lastIndex: number, index: number) => {
  const moved = !snap && lastIndex >= 0 && lastIndex !== index;
  return moved ? menuTravelMs(Math.abs(index - lastIndex)) : 0;
};
