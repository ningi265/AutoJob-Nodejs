const express = require('express');

const healthController = require('../controllers/healthController');
const jobsController = require('../controllers/jobsController');
const coverController = require('../controllers/coverController');
const mergeController = require('../controllers/mergeController');

const router = express.Router();

// Health
router.get('/health', healthController.healthCheck);

// Jobs (category-based scraping/filtering)
router.get('/job-categories', jobsController.getJobCategories);
router.post('/jobs', jobsController.getJobsByCategory);

// CV qualifications extraction
router.post('/extract-qualifications', coverController.extractQualifications);

// Cover letter generation
router.post('/generate-cover-letter', coverController.generateCoverLetter);

// PDF merge
router.post('/merge-documents', mergeController.mergeDocuments);

// Download endpoints (accept base64 via query, mirror Python behavior)
router.get('/download-cover-letter/:job_id', coverController.downloadCoverLetter);
router.get('/download-merged/:job_id', mergeController.downloadMergedPdf);

module.exports = router;
