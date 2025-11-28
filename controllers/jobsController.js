const scrapeService = require('../services/scrapeService');
const filterService = require('../services/filterService');

exports.getJobCategories = (req, res) => {
  const categories = Object.entries(filterService.JOB_CATEGORIES).map(([key, keywords]) => ({
    value: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    keyword_count: keywords.length,
  }));

  return res.json({
    success: true,
    categories,
    approach: 'scrape_all_then_filter',
  });
};

exports.getJobsByCategory = async (req, res, next) => {
  try {
    const { job_category, user_qualifications = '' } = req.body || {};

    if (!job_category) {
      return res.status(400).json({
        success: false,
        message: 'job_category is required',
      });
    }

    if (!filterService.JOB_CATEGORIES[job_category]) {
      const available = Object.keys(filterService.JOB_CATEGORIES);
      return res.status(400).json({
        success: false,
        message: `Invalid job_category. Available categories: ${available.join(', ')}`,
      });
    }

    console.log(`🔍 Job search request for category: ${job_category}`);
    console.log(`📋 User qualifications provided: ${user_qualifications ? 'Yes' : 'No'}`);

    const jobs = await scrapeService.scrapeAndFilterJobs(job_category, user_qualifications);

    return res.json({
      success: true,
      total_jobs_found: jobs.length,
      filtered_jobs_count: jobs.length,
      category: job_category,
      jobs,
      source: 'jobsearchmalawi.com',
      filtering_method: 'scrape_all_then_filter',
      message: `Found ${jobs.length} jobs for '${job_category}' category`,
    });
  } catch (err) {
    console.error('❌ Error in getJobsByCategory:', err);
    return res.status(500).json({
      success: false,
      total_jobs_found: 0,
      filtered_jobs_count: 0,
      category: req.body?.job_category || 'unknown',
      jobs: [],
      source: 'jobsearchmalawi.com',
      filtering_method: 'error',
      error: err.message,
      message: 'An error occurred while searching for jobs. Please try again.',
    });
  }
};

exports.getAllRecentJobs = async (req, res, next) => {
  try {
    const jobs = await scrapeService.scrapeAllJobsComprehensive();

    return res.json({
      success: true,
      total_jobs_found: jobs.length,
      jobs,
      source: 'jobsearchmalawi.com',
      message: `Found ${jobs.length} recent jobs across all categories`,
    });
  } catch (err) {
    console.error('❌ Error in getAllRecentJobs:', err);
    return res.status(500).json({
      success: false,
      total_jobs_found: 0,
      jobs: [],
      source: 'jobsearchmalawi.com',
      error: err.message,
      message: 'An error occurred while fetching recent jobs. Please try again.',
    });
  }
};

exports.getJobDetails = async (req, res, next) => {
  try {
    const { job_url } = req.body || {};
    if (!job_url) {
      return res.status(400).json({
        success: false,
        message: 'job_url is required',
      });
    }

    const details = await scrapeService.scrapeJobDetails(job_url);

    return res.json({
      success: true,
      job_url,
      details,
    });
  } catch (err) {
    console.error('❌ Error in getJobDetails:', err);
    return res.status(500).json({
      success: false,
      job_url: req.body?.job_url || null,
      details: null,
      error: err.message,
      message: 'An error occurred while fetching job details. Please try again.',
    });
  }
};
