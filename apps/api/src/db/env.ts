import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const candidates = () => [
  resolve(__dirname, "../../../.env"),
  resolve(__dirname, "../../../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];

export const loadEnv = () => {
  for (const path of candidates().filter((file) => existsSync(file))) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
};
