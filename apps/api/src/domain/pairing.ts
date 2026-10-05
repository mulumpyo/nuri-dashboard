import { randomInt } from "node:crypto";

export const pairingCode = () => String(randomInt(100000, 1000000));
