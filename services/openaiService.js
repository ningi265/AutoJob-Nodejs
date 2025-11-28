const { OpenAI } = require('openai');
const logger = require('../utils/logger');

const apiKey = process.env.OPENAI_API_KEY;

let client = null;
if (apiKey) {
  client = new OpenAI({ apiKey });
}

async function generateCoverLetter(userProfile, jobListing) {
  try {
    if (!client) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const skillsList = Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : '';

    const prompt = `Write a professional cover letter using this exact format structure:

[Applicant Name]
[Address]
[Email]
[Phone]

[Date]

[Recipient]
[Company Name]
[Company Address]

Dear Hiring Manager,

Re: Application for [Position Title] Position

I am writing to express my [strong/sincere] interest in the position of [Position Title] at [Company Name]. [Brief background and qualification statement that connects to the role]

[Paragraph about relevant experience and achievements - be specific about how experience relates to the role]

[Optional additional paragraph about additional relevant experience or skills]

[Paragraph expressing enthusiasm for the company and role, and summarizing why you're a good fit]

Thank you for considering my application. I am available for an interview at your earliest convenience and can be reached via phone or email.

Yours faithfully,
[Applicant Name]

Job Details:
- Position: ${jobListing.title}
- Company: ${jobListing.company}
- Location: ${jobListing.location}

Applicant Details:
- Name: ${userProfile.full_name}
- Email: ${userProfile.email}
- Phone: ${userProfile.phone}
- Address: ${userProfile.address}
- Years of Experience: ${userProfile.experience_years}
- Education: ${userProfile.education}
- Key Skills: ${skillsList}
- Professional Summary: ${userProfile.summary}

Requirements:
1. Follow the EXACT format structure shown above
2. Professional and formal tone like Brian's letter
3. Address specific company and position
4. Highlight relevant skills and experience
5. Keep it concise (around 300-400 words)
6. Use proper business letter formatting with line breaks
7. Make it personal and compelling
8. End with "Yours faithfully" like the template

Make sure to include proper spacing between sections and use a natural date format like "11th April 2025".`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (err) {
    logger.error('Error generating cover letter:', err);

    const now = new Date();
    const day = now.getDate();
    const suffix = (day >= 4 && day <= 20) || (day >= 24 && day <= 30)
      ? 'th'
      : ['st', 'nd', 'rd'][(day % 10) - 1] || 'th';
    const formattedDate = `${day}${suffix} ${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;

    const fallbackSkills = Array.isArray(userProfile.skills) ? userProfile.skills.slice(0, 3).join(', ') : '';

    return `${userProfile.full_name}
${userProfile.address}
Email: ${userProfile.email}
Phone: ${userProfile.phone}

${formattedDate}

Hiring Manager
${jobListing.company}
${jobListing.location}

Dear Hiring Manager,

Re: Application for ${jobListing.title} Position

I am writing to express my sincere interest in the position of ${jobListing.title} at ${jobListing.company}. With ${userProfile.experience_years} years of experience in ${userProfile.education} and expertise in ${fallbackSkills}, I am confident I would be a valuable addition to your team.

${userProfile.summary}

My combined academic and professional experience uniquely position me to excel in this role. I am particularly drawn to this opportunity at ${jobListing.company} because of your reputation for excellence and innovation in the industry.

Thank you for considering my application. I am available for an interview at your earliest convenience and can be reached via phone or email.

Yours faithfully,
${userProfile.full_name}`;
  }
}

module.exports = {
  generateCoverLetter,
};
