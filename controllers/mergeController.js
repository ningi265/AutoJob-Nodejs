const mergeService = require('../services/mergeService');

exports.mergeDocuments = async (req, res, next) => {
  try {
    const { cover_letter_pdf } = req.body;
    const uploadedFiles = req.files || [];

    if (!cover_letter_pdf) {
      return res.status(400).json({ success: false, message: 'cover_letter_pdf (base64) is required' });
    }

    const mergedBuffer = await mergeService.mergeDocuments(cover_letter_pdf, uploadedFiles);
    const mergedPdfBase64 = mergedBuffer.toString('base64');

    return res.json({
      success: true,
      merged_pdf_base64: mergedPdfBase64,
      message: 'Documents merged successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadMergedPdf = (req, res, next) => {
  try {
    const { pdf_data } = req.query;
    if (!pdf_data) {
      return res.status(400).json({ success: false, message: 'pdf_data query parameter is required' });
    }

    const pdfBuffer = Buffer.from(pdf_data, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="merged-${req.params.job_id || 'download'}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
