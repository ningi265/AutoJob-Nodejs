const logger = require('../utils/logger');

const JOB_CATEGORIES = {
  technology: ['developer', 'programmer', 'software', 'IT', 'ICT', 'tech', 'computer', 'web', 'data', 'system', 'network', 'database', 'AI', 'machine learning', 'coding', 'programming', 'python', 'java', 'react', 'frontend', 'backend'],
  accounting: ['accountant', 'accounting', 'finance', 'financial', 'bookkeeper', 'auditor', 'tax', 'payroll', 'budget', 'audit', 'treasury', 'cost', 'management accountant'],
  healthcare: ['nurse', 'doctor', 'medical', 'health', 'clinical', 'pharmacy', 'dentist', 'therapist', 'healthcare', 'hospital', 'clinic', 'patient', 'medical officer'],
  education: ['teacher', 'instructor', 'lecturer', 'professor', 'education', 'tutor', 'academic', 'school', 'university', 'teaching', 'curriculum', 'headmaster'],
  engineering: ['engineer', 'engineering', 'civil', 'mechanical', 'electrical', 'construction', 'technical', 'structural', 'project engineer', 'site engineer'],
  marketing: ['marketing', 'sales', 'advertising', 'promotion', 'brand', 'digital marketing', 'social media', 'campaign', 'customer', 'business development'],
  human_resources: ['HR', 'human resources', 'recruitment', 'talent', 'personnel', 'employee', 'training', 'organizational', 'payroll officer'],
  legal: ['lawyer', 'legal', 'attorney', 'law', 'paralegal', 'compliance', 'legal advisor', 'legal officer', 'court', 'litigation'],
  agriculture: ['agriculture', 'farming', 'agricultural', 'agribusiness', 'livestock', 'crops', 'farm', 'irrigation', 'extension', 'agronomist'],
  general: [],
};

function filterJobsByCategory(allJobs, category) {
  if (category === 'general') {
    logger.info("🎯 Category 'general' selected - returning all jobs");
    return allJobs;
  }

  if (!JOB_CATEGORIES[category]) {
    logger.warn(`⚠️  Unknown category '${category}', returning all jobs`);
    return allJobs;
  }

  const keywords = JOB_CATEGORIES[category];
  const filtered = [];

  logger.info(`🔍 Filtering ${allJobs.length} jobs for category: ${category}`);
  logger.info(`📋 Using keywords: ${keywords.slice(0, 5).join(', ')}...`);

  for (const job of allJobs) {
    const text = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
    const matches = keywords.filter((kw) => text.includes(kw.toLowerCase()));
    if (matches.length) {
      filtered.push({ ...job, category_matches: matches });
    }
  }

  logger.info(`✅ Found ${filtered.length} jobs matching '${category}' category`);
  if (!filtered.length) {
    logger.warn(`⚠️  No jobs found for '${category}' category, you may want to try 'general' category`);
  }

  return filtered;
}

function calculateJobRelevanceSimple(job, userQualifications = '') {
  if (!userQualifications.trim()) return 0.8;

  try {
    const jobText = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
    const qText = userQualifications.toLowerCase();

    let score = 0.6;

    if (/(bachelor|master|degree|diploma)/.test(qText)) {
      score += 0.1;
    }

    const expMatch = qText.match(/(\d+)\s*years?\s*experience/);
    if (expMatch) {
      const years = parseInt(expMatch[1], 10);
      if (years >= 2) score += 0.1;
      if (years >= 5) score += 0.1;
    }

    const skills = qText.match(/\b\w{3,}\b/g) || [];
    const matches = skills.filter((s) => jobText.includes(s));
    if (matches.length) {
      score += Math.min(0.2, matches.length * 0.02);
    }

    return Math.min(1.0, score);
  } catch (e) {
    return 0.7;
  }
}

function getDemoJobsForCategory(category) {
  const demoJobs = [
    { title: 'Web Developer', company: 'Glorious Integrated Farming Limited', location: 'Blantyre', job_type: 'Full Time', posted_time: '1 hour ago', job_url: 'https://jobsearchmalawi.com/job/web-developer/', description: 'Develop and maintain web applications using modern frameworks', source_website: 'jobsearchmalawi.com' },
    { title: 'ICT Officer', company: 'ND Madalitso', location: 'Lilongwe', job_type: 'Full Time', posted_time: '1 day ago', job_url: 'https://jobsearchmalawi.com/job/ict-officer/', description: 'Manage IT infrastructure and provide technical support', source_website: 'jobsearchmalawi.com' },
    { title: 'Software Engineer', company: 'Tech Solutions Malawi', location: 'Blantyre', job_type: 'Full Time', posted_time: '2 days ago', job_url: 'https://jobsearchmalawi.com/job/software-engineer/', description: 'Design and develop software solutions for various clients', source_website: 'jobsearchmalawi.com' },
    { title: 'Senior Accountant', company: 'ABC Financial Services', location: 'Lilongwe', job_type: 'Full Time', posted_time: '2 hours ago', job_url: 'https://jobsearchmalawi.com/job/senior-accountant/', description: 'Manage financial records and prepare financial statements', source_website: 'jobsearchmalawi.com' },
    { title: 'Registered Nurse', company: 'Malawi Ministry of Health', location: 'Blantyre', job_type: 'Full Time', posted_time: '1 day ago', job_url: 'https://jobsearchmalawi.com/job/registered-nurse/', description: 'Provide quality nursing care to patients in hospital setting', source_website: 'jobsearchmalawi.com' },
  ];

  if (category !== 'general') {
    const filtered = filterJobsByCategory(demoJobs, category);
    return filtered.length ? filtered : demoJobs.slice(0, 5);
  }

  return demoJobs;
}

module.exports = {
  JOB_CATEGORIES,
  filterJobsByCategory,
  calculateJobRelevanceSimple,
  getDemoJobsForCategory,
};
