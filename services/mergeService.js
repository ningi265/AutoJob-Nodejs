const PDFMerger = require('pdf-merger-js');
const logger = require('../utils/logger');

async function mergeDocuments(coverLetterBase64, uploadedFiles) {
  try {
    const merger = new PDFMerger();

    const coverBuffer = Buffer.from(coverLetterBase64, 'base64');
    await merger.add(coverBuffer);

    for (const file of uploadedFiles) {
      if (!file.originalname.toLowerCase().endsWith('.pdf')) continue;
      await merger.add(file.buffer);
    }

    const mergedBuffer = await merger.saveAsBuffer();
    return mergedBuffer;
  } catch (err) {
    logger.error('Error merging documents:', err);
    throw err;
  }
}

module.exports = {
  mergeDocuments,
};
