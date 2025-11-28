const { extractQualificationsFromPdf } = require('../services/pdfService');
const { generateCoverLetter } = require('../services/openaiService');
const { createCoverLetterPdf } = require('../services/pdfService');

exports.extractQualifications = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }
    if (!file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, message: 'Only PDF files are supported' });
    }

    const qualifications = await extractQualificationsFromPdf(file.buffer);

    return res.json({
      success: true,
      qualifications,
    });
  } catch (err) {
    next(err);
  }
};

exports.generateCoverLetter = async (req, res, next) => {
  try {
    const { user_profile, job_listing } = req.body || {};
    if (!user_profile || !job_listing) {
      return res.status(400).json({ success: false, message: 'user_profile and job_listing are required' });
    }

    const coverLetterText = await generateCoverLetter(user_profile, job_listing);
    const pdfBuffer = await createCoverLetterPdf(coverLetterText, user_profile);
    const pdfBase64 = pdfBuffer.toString('base64');

    return res.json({
      success: true,
      cover_letter_text: coverLetterText,
      pdf_base64: pdfBase64,
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadCoverLetter = (req, res, next) => {
  try {
    const { pdf_data } = req.query;
    if (!pdf_data) {
      return res.status(400).json({ success: false, message: 'pdf_data query parameter is required' });
    }

    const pdfBuffer = Buffer.from(pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cover-letter-${req.params.job_id || 'download'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
