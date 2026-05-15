import { PDFParse } from 'pdf-parse';

async function test() {
  try {
    const parser = new PDFParse({ data: Buffer.from("dummy") });
    console.log('PDFParse instance created');
    console.log('getText type:', typeof parser.getText);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
