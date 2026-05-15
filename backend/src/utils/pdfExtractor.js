import PDFParser from 'pdf2json';

/**
 * Extracts text from a PDF buffer using pdf2json (pure Node.js, no browser APIs)
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);

    parser.on('pdfParser_dataReady', (data) => {
      try {
        const text = (data.Pages || [])
          .flatMap(page => page.Texts || [])
          .map(t => decodeURIComponent(t.R?.map(r => r.T).join('') || ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!text) {
          return reject(new Error('Không trích xuất được văn bản. PDF có thể là ảnh scan.'));
        }
        resolve(text);
      } catch (e) {
        reject(e);
      }
    });

    parser.on('pdfParser_dataError', (err) => {
      reject(new Error(err.parserError || 'Không thể đọc file PDF.'));
    });

    parser.parseBuffer(buffer);
  });
}
