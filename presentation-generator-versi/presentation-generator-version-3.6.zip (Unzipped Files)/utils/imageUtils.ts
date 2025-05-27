// utils/imageUtils.ts
export const downloadDataUrl = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // For data URLs, URL.revokeObjectURL is not strictly necessary as it's not an object URL,
  // but it doesn't hurt.
};
