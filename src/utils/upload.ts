// Local stub for `@/utils/upload`. Upstream did real file uploads to a
// backend; this template runs on dummy data so we just return a fake URL.

export async function uploadPdf(_file: File | Blob | unknown): Promise<string> {
  return "data:application/pdf;base64,";
}

export async function uploadImage(_file: File | Blob | unknown): Promise<string> {
  return "data:image/png;base64,";
}

export async function uploadFile(_file: File | Blob | unknown): Promise<string> {
  return "data:application/octet-stream;base64,";
}

export default { uploadPdf, uploadImage, uploadFile };
