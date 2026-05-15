import { PDFParse } from 'pdf-parse';

/**
 * Extracts text from a PDF buffer
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(buffer) {
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return data.text;
  } catch (error) {
    console.error('[PDF Extraction Error]', error);
    throw new Error('Không thể trích xuất văn bản từ file PDF. File có thể bị hỏng hoặc có mật khẩu.');
  }
}
