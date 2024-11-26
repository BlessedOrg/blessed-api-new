export function calculateBase64FileSize(base64String: string): number {
  const base64Data = base64String.replace(/^data:(.+);base64,/, "");

  const padding = (base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0);
  const fileSizeInBytes = (base64Data.length * (3 / 4)) - padding;

  return fileSizeInBytes;
}
