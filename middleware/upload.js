const multer = require('multer');

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_PDF_SIZE_MB || '10', 10);

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: parseInt(process.env.MAX_PDF_COUNT || '10', 10),
  },
});

module.exports = upload;
