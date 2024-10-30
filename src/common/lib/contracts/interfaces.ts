import * as fs from "node:fs";
import { basename, join } from "path";

export function importAllJsonContractsArtifacts() {
  const dirPath = join(process.cwd(), "src", "common", "lib", "contracts", "artifacts");
  const files = fs.readdirSync(dirPath);
  const jsonObjects: { [key: string]: any } = {};

  files.forEach((file) => {
    if (file.endsWith(".json")) {
      const filePath = join(dirPath, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const fileName = basename(file, ".json");
      jsonObjects[fileName] = JSON.parse(fileContent);
    }
  });
  return jsonObjects;
}
