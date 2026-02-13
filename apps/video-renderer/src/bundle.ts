import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";

let bundleLocation: string | null = null;

export async function getBundle(): Promise<string> {
  if (bundleLocation) return bundleLocation;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const entryPoint = path.resolve(__dirname, "Root.tsx");

  bundleLocation = await bundle({
    entryPoint,
    onProgress: (progress) => {
      if (progress === 100) console.log("Remotion bundle ready");
    },
  });

  return bundleLocation;
}
