const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const filterService = require('./filterService');
const logger = require('../utils/logger');
const puppeteer = require('puppeteer');

const JOBSEARCH_MALAWI_URLS = [
  'https://jobsearchmalawi.com/',
  'https://jobsearchmalawi.com/jobs/',
];

const DEFAULT_USER_AGENT = process.env.SCRAPE_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function parseJobDate(dateText) {
  if (!dateText) return new Date();
  try {
    const text = String(dateText).toLowerCase().trim();
    const now = new Date();

    const numMatch = text.match(/(\d+)/);
    const n = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (text.includes('hour') || text.includes('hr')) {
      return new Date(now.getTime() - (n || 1) * 60 * 60 * 1000);
    }
    if (text.includes('yesterday')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    if (text.includes('day')) {
      return new Date(now.getTime() - (n || 1) * 24 * 60 * 60 * 1000);
    }
    if (text.includes('week')) {
      return new Date(now.getTime() - (n || 1) * 7 * 24 * 60 * 60 * 1000);
    }
    if (text.includes('month')) {
      return new Date(now.getTime() - (n || 1) * 30 * 24 * 60 * 60 * 1000);
    }
    if (text.includes('today') || text.includes('recent')) {
      return now;
    }

    const parsed = new Date(text);
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(parsed.getTime())) return parsed;
    return now;
  } catch (e) {
    return new Date();
  }
}

function isRecentJob(dateText, cutoffDays = 45) {
  try {
    const jobDate = parseJobDate(dateText);
    const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
    return jobDate >= cutoff;
  } catch (e) {
    return true;
  }
}

function extractJobDetails($elem, baseUrl = 'https://jobsearchmalawi.com') {
  try {
    const findText = (selectors) => {
      for (const sel of selectors) {
        const el = $elem.find(sel).first();
        if (el && el.text().trim()) return el.text().trim();
      }
      return '';
    };

    // WP Job Manager / job_listing-specific selectors first
    let title = findText(['.job_listing-title', '.job-title', '.job_title', 'h3.job-title', 'h3.job_title', 'h2', 'h3', 'a.job_listing-clickbox', 'a.job-title', 'a']);
    if (!title) return null;
    const badTitles = ['read more', 'view more', 'see more', 'apply now'];
    if (title.length < 3 || badTitles.includes(title.toLowerCase())) return null;

    let company = findText([
      '.job_listing-company',
      '.job-company',
      '.company',
      '.employer',
      '.organization',
      'strong',
      'b',
    ]) || 'Company Not Listed';

    let location = findText([
      '.job_listing-location',
      '.job-location',
      '.location',
      '.place',
      '.address',
    ]) || 'Malawi';

    let postedTime = findText([
      '.job_listing-date',
      '.date-posted',
      '.date',
      '.time',
      '.posted',
      'time',
    ]) || 'Recent';

    let jobUrl = '';
    // Prefer the main clickable job link if present
    const mainLink = $elem.find('a.job_listing-clickbox, a.job-title, a.job_title').first();
    const link = mainLink.length ? mainLink : $elem.find('a').first();
    if (link && link.attr('href')) {
      jobUrl = link.attr('href');
      if (!jobUrl.startsWith('http')) {
        jobUrl = new URL(jobUrl, baseUrl).toString();
      }
    }

    return {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      job_type: 'Full Time',
      posted_time: postedTime.trim(),
      job_url: jobUrl,
      description: '',
      source_website: 'jobsearchmalawi.com',
    };
  } catch (e) {
    logger.error('Error extracting job details:', e);
    return null;
  }
}

async function scrapeAllJobsComprehensive() {
  const jobs = [];
  logger.info('🚀 Starting comprehensive scraping of ALL jobs from JobSearch Malawi');

  const useHeadless = process.env.USE_HEADLESS_BROWSER === 'true';

  if (useHeadless) {
    // Headless browser mode (Puppeteer): lets site JS render all listings
    let browser;
    try {
      logger.info('🧠 Using headless browser (Puppeteer) for scraping');
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setUserAgent(DEFAULT_USER_AGENT);

      for (const url of JOBSEARCH_MALAWI_URLS) {
        logger.info(`📄 (browser) Loading ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait a bit for JS to render initial listings
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Only parse initially rendered listings on the first page (no load-more clicks)
        const html = await page.content();
        const $ = cheerio.load(html);

        // JobSearch Malawi listings likely use WP Job Manager markup (li.job_listing)
        let jobElems = $('li.job_listing, .job_listing, [class*=job_listing]').toArray();
        if (!jobElems.length) {
          jobElems = $('article.job, div.job, article, div[class*=job]').toArray();
        }

        logger.info(`   📊 (browser) Found ${jobElems.length} potential job elements`);

        let jobsFoundOnPage = 0;
        for (const elem of jobElems) {
          const jobData = extractJobDetails($(elem));
          if (!jobData) continue;

          // For headless mode, include all visible listings regardless of age
          const isDuplicate = jobs.some(
            (j) =>
              j.title.toLowerCase().trim() === jobData.title.toLowerCase().trim() &&
              j.company.toLowerCase().trim() === jobData.company.toLowerCase().trim(),
          );
          if (isDuplicate) continue;

          jobs.push(jobData);
          jobsFoundOnPage += 1;
        }
        logger.info(`   ✅ (browser) Extracted ${jobsFoundOnPage} valid jobs from this page`);
      }
    } catch (err) {
      logger.error('   ❌ Headless scraping failed, falling back to HTTP scraping:', err.message || err);
    } finally {
      if (browser) await browser.close();
    }
  }

  // Fallback / default: HTTP + cheerio (existing behavior)
  if (!jobs.length) {
    const headers = { 'User-Agent': DEFAULT_USER_AGENT };

    const visited = new Set();
    const queue = [...JOBSEARCH_MALAWI_URLS];
    let pageCount = 0;

    while (queue.length && pageCount < 20) {
      const currentUrl = queue.shift();
      if (!currentUrl || visited.has(currentUrl)) continue;
      visited.add(currentUrl);
      pageCount += 1;

      try {
        logger.info(`📄 Scraping page ${pageCount}: ${currentUrl}`);
        const resp = await axios.get(currentUrl, {
          headers,
          timeout: parseInt(process.env.SCRAPE_TIMEOUT_MS || '10000', 10),
        });
        const $ = cheerio.load(resp.data);

        let jobElems = $('div.job-listing').toArray();
        if (!jobElems.length) jobElems = $('article.job').toArray();
        if (!jobElems.length) jobElems = $('div.job').toArray();
        if (!jobElems.length) jobElems = $('article').toArray();
        if (!jobElems.length) jobElems = $('div[class*=job], div[class*=listing], div[class*=card], div[class*=post]').toArray();

        if (!jobElems.length) {
          logger.warn('   ⚠️  No job elements found, trying broader search...');
          jobElems = $('article, div.post, div.entry, div.item, div.content').toArray();
        }

        logger.info(`   📊 Found ${jobElems.length} potential job elements`);

        let jobsFoundOnPage = 0;
        let oldJobsCount = 0;

        for (const elem of jobElems) {
          const jobData = extractJobDetails($(elem));
          if (!jobData) continue;

          if (!isRecentJob(jobData.posted_time, 30)) {
            oldJobsCount += 1;
            continue;
          }

          const isDuplicate = jobs.some(
            (j) =>
              j.title.toLowerCase().trim() === jobData.title.toLowerCase().trim() &&
              j.company.toLowerCase().trim() === jobData.company.toLowerCase().trim(),
          );
          if (isDuplicate) continue;

          jobs.push(jobData);
          jobsFoundOnPage += 1;
        }

        logger.info(`   ✅ Extracted ${jobsFoundOnPage} valid jobs from this page`);
        if (oldJobsCount > 0) logger.info(`   ⏰ Skipped ${oldJobsCount} old jobs`);

        if (pageCount <= 15) {
          const links = $('a[href*="/page/"]').toArray();
          for (const link of links) {
            const href = $(link).attr('href');
            if (!href) continue;
            const url = href.startsWith('http') ? href : new URL(href, currentUrl).toString();
            if (!visited.has(url) && !queue.includes(url)) {
              queue.push(url);
            }
          }
        }
      } catch (err) {
        logger.error(`   ❌ Error scraping ${currentUrl}:`, err.message || err);
        continue;
      }
    }
  }

  logger.info('🎯 Comprehensive scraping completed!');
  logger.info(`📊 Total jobs found: ${jobs.length}`);

  return jobs;
}

async function scrapeJobDetails(jobUrl) {
  // Fetch the job detail page and extract a structured description
  const headers = { 'User-Agent': DEFAULT_USER_AGENT };

  const resp = await axios.get(jobUrl, {
    headers,
    timeout: parseInt(process.env.SCRAPE_TIMEOUT_MS || '10000', 10),
  });
  const $ = cheerio.load(resp.data);

  // These selectors are generic but tuned for WP job detail pages
  const title = $('h1, h2.entry-title').first().text().trim() || null;
  const company = $('.company, .job-company, .job_listing-company, .employer')
    .first()
    .text()
    .trim() || null;
  const location = $('.location, .job-location, .job_listing-location')
    .first()
    .text()
    .trim() || null;

  // Full description: take the main content block
  const descContainer =
    $('.job_description, .job-description, .entry-content, .content-area').first();
  let descriptionHtml = descContainer.html() || '';
  let descriptionText = descContainer.text() || '';
  descriptionHtml = descriptionHtml.trim();
  descriptionText = descriptionText.replace(/\s+/g, ' ').trim();

  // Extract any mailto email addresses from the page
  const emails = [];
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (email && !emails.includes(email)) {
      emails.push(email);
    }
  });

  // Extract application URLs (prefer links in the application/description area)
  const application_links = [];
  const appScope = $('.job_application, .job-application, .application, .application_details, .job_description');

  appScope.find('a, button').each((_, el) => {
    const text = $(el).text().toLowerCase();
    const href = $(el).attr('href');

    // Only consider obvious apply actions or explicit external links in the application area
    const isApplyText = /apply|submit application|send cv|send resume/.test(text);
    const isHttpLink = href && /^https?:\/\//i.test(href || '');

    if (!isApplyText && !isHttpLink) return;

    if (!href) return;

    // Avoid adding the main job listing URL itself as an application link
    try {
      const jobUrlHost = new URL(jobUrl).host;
      const hrefUrl = new URL(href, jobUrl);
      const isSamePage = hrefUrl.href.replace(/#.*$/, '') === jobUrl.replace(/#.*$/, '');
      if (isSamePage) return;

      // Still allow off-site links (e.g. ZohoRecruit, company careers pages)
      if (!application_links.includes(hrefUrl.href)) {
        application_links.push(hrefUrl.href);
      }
    } catch (e) {
      // If URL parsing fails, fall back to raw href if unique
      if (!application_links.includes(href)) {
        application_links.push(href);
      }
    }
  });

  return {
    title,
    company,
    location,
    description_text: descriptionText || null,
    description_html: descriptionHtml || null,
    emails,
    application_links,
  };
}

async function scrapeAndFilterJobs(category = 'general', userQualifications = '') {
  logger.info(`🚀 Starting job search for category: ${category}`);
  const start = Date.now();

  logger.info('📊 Step 1: Scraping ALL jobs from JobSearch Malawi...');
  let allJobs = await scrapeAllJobsComprehensive();

  if (!allJobs.length) {
    logger.warn('⚠️  No jobs found from scraping, using demo data...');
    allJobs = filterService.getDemoJobsForCategory(category);
  }

  logger.info(`📋 Total jobs scraped: ${allJobs.length}`);

  logger.info('🔍 Step 2: Filtering jobs by category...');
  const categoryJobs = filterService.filterJobsByCategory(allJobs, category);

  logger.info('🎯 Step 3: Calculating job relevance...');
  const finalJobs = categoryJobs
    .map((job) => ({
      ...job,
      relevance_score: filterService.calculateJobRelevanceSimple(job, userQualifications),
      category: category.replace('_', ' ').toUpperCase(),
    }))
    .sort((a, b) => (b.relevance_score || 0.5) - (a.relevance_score || 0.5));

  const elapsed = (Date.now() - start) / 1000;
  logger.info(`⏱️  Job search completed in ${elapsed.toFixed(2)} seconds`);
  logger.info(`🎯 Final result: ${finalJobs.length} jobs for '${category}' category`);

  return finalJobs;
}

module.exports = {
  scrapeAndFilterJobs,
  scrapeAllJobsComprehensive,
  scrapeJobDetails,
};
