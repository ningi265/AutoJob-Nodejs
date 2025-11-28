const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');
const fs = require('fs');
const logger = require('../utils/logger');

async function extractQualificationsFromPdf(buffer) {
  try {
    // Basic text extraction via pdf-lib (not perfect but works for many PDFs)
    const pdf = await PDFLibDocument.load(buffer);
    let text = '';
    const pages = pdf.getPages();
    for (const page of pages) {
      const pageText = await page.getTextContent?.();
      if (pageText && pageText.items) {
        text += pageText.items.map((i) => i.str || '').join(' ');
      }
    }

    if (!text.trim()) {
      // fallback: return empty string
      return '';
    }

    return text.slice(0, 500);
  } catch (err) {
    logger.error('Error extracting qualifications:', err);
    return '';
  }
}

async function createCoverLetterPdf(coverLetterText, userProfile) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 72 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.fontSize(11);

      const paragraphs = String(coverLetterText).split('\n\n');
      for (const para of paragraphs) {
        const lines = para.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            doc.text(line.trim(), { align: 'left' });
          }
        }
        doc.moveDown();
      }

      doc.end();
    } catch (err) {
      logger.error('Error creating PDF:', err);
      reject(err);
    }
  });
}

module.exports = {
  extractQualificationsFromPdf,
  createCoverLetterPdf,
};
