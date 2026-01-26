// playground/upwork-analyzer.ts
// Run with: npx tsx playground/upwork-analyzer.ts
// Or add to package.json scripts: "playground": "tsx playground/upwork-analyzer.ts"

import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Types for Upwork profile data
interface Location {
  city: string;
  country: string;
}

interface Review {
  rating: number;
  comment: string;
  client: string;
  date: string;
}

interface Employment {
  company: string;
  title: string;
  period: string;
  description: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
  period: string;
}

interface PortfolioItem {
  title: string;
  description: string;
  url?: string;
}

interface UpworkProfile {
  profileId: string;
  name: string;
  title: string;
  overview: string;
  skills: string[];
  hourlyRate: number;
  totalEarnings: number;
  location: Location;
  jobSuccess: number;
  rating: number;
  reviews: Review[];
  employmentHistory: Employment[];
  education: Education[];
  portfolio: PortfolioItem[];
}

// Configuration
const PILOTERR_API_KEY = process.env.PILOTERR_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * Fetches Upwork profile data from Piloterr API
 * NOTE: The Upwork Talent endpoint is PRIVATE - you must request access at:
 * https://www.piloterr.com/library/upwork-talent
 * 
 * After approval, the endpoint will be: https://piloterr.com/api/v2/upwork/talent
 */
async function getUpworkProfile(profileUrl: string): Promise<UpworkProfile> {
  const profileId = profileUrl.split('~')[1];
  
  if (!profileId) {
    throw new Error('Invalid Upwork profile URL. Expected format: https://www.upwork.com/freelancers/~<ID>');
  }

  console.log(`📥 Fetching profile for ID: ${profileId}...`);

  // Correct endpoint after access is granted
  const response = await fetch(`https://piloterr.com/api/v2/upwork/talent?query=${profileId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PILOTERR_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Piloterr API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Profile fetched successfully!\n');
  return data as UpworkProfile;
}

/**
 * ALTERNATIVE: Use Piloterr's Web Rendering API to scrape the profile page directly
 * This works immediately without requesting access to private endpoints
 */
async function getUpworkProfileViaRendering(profileUrl: string): Promise<any> {
  console.log(`📥 Fetching profile via rendering API: ${profileUrl}...`);

  const response = await fetch('https://piloterr.com/api/v2/website/rendering', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': PILOTERR_API_KEY,
    },
    // Note: Check docs for exact parameter name (might be 'url' or 'query')
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Piloterr rendering API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const html = await response.text();
  console.log('✅ Page HTML fetched successfully!');
  console.log('⚠️  Note: You\'ll need to parse the HTML to extract profile data\n');
  
  // TODO: Parse HTML to extract profile data
  // You could use cheerio or similar library for this
  return { html, profileUrl };
}

/**
 * Formats review data for context
 */
function formatReviews(reviews: Review[], limit: number = 5): string {
  if (!reviews || reviews.length === 0) return 'No reviews available';
  
  return reviews
    .slice(0, limit)
    .map(review => 
      `- ${review.rating}/5 stars by ${review.client}: "${review.comment}"`
    )
    .join('\n');
}

/**
 * Formats employment history for context
 */
function formatEmployment(employment: Employment[]): string {
  if (!employment || employment.length === 0) return 'No employment history available';
  
  return employment
    .map(job => 
      `- ${job.title} at ${job.company} (${job.period})\n  ${job.description}`
    )
    .join('\n\n');
}

/**
 * Formats education for context
 */
function formatEducation(education: Education[]): string {
  if (!education || education.length === 0) return 'No education information available';
  
  return education
    .map(edu => 
      `- ${edu.degree} in ${edu.field} from ${edu.school} (${edu.period})`
    )
    .join('\n');
}

/**
 * Converts profile data to LLM-friendly context
 */
function formatProfileContext(profile: UpworkProfile): string {
  return `
Upwork Freelancer Profile:

Name: ${profile.name}
Title: ${profile.title}
Overview: ${profile.overview}

Skills: ${profile.skills.join(', ')}
Hourly Rate: $${profile.hourlyRate}/hour
Total Earnings: $${profile.totalEarnings.toLocaleString()}
Job Success Rate: ${profile.jobSuccess}%
Rating: ${profile.rating}/5 stars

Location: ${profile.location.city}, ${profile.location.country}

Recent Client Reviews:
${formatReviews(profile.reviews)}

Employment History:
${formatEmployment(profile.employmentHistory)}

Education:
${formatEducation(profile.education)}

Portfolio Projects: ${profile.portfolio.length} items
`.trim();
}

/**
 * Chat about an Upwork profile using OpenAI
 */
async function chatAboutProfile(
  profileUrl: string, 
  userQuestion: string
): Promise<string> {
  try {
    // 1. Fetch profile data from Piloterr
    const profileData = await getUpworkProfile(profileUrl);
    
    // 2. Format context for LLM
    const context = formatProfileContext(profileData);
    
    // 3. Send to OpenAI
    console.log('🤖 Asking OpenAI...\n');
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-4o-mini" for cheaper option
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes Upwork freelancer profiles and provides insights about their skills, experience, and fit for projects."
        },
        {
          role: "user",
          content: `${context}\n\nBased on this Upwork freelancer profile, please answer the following question:\n\n${userQuestion}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    return completion.choices[0].message.content || 'No response generated';
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Streaming version for better UX
 */
async function chatAboutProfileStreaming(
  profileUrl: string, 
  userQuestion: string
): Promise<void> {
  try {
    const profileData = await getUpworkProfile(profileUrl);
    const context = formatProfileContext(profileData);
    
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
    
    console.log('🤖 OpenAI Response (streaming):\n');
    console.log('─'.repeat(60));
    
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes Upwork freelancer profiles and provides insights about their skills, experience, and fit for projects."
        },
        {
          role: "user",
          content: `${context}\n\nBased on this Upwork freelancer profile, please answer the following question:\n\n${userQuestion}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true,
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
    }
    
    console.log('\n' + '─'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

/**
 * Interactive conversation mode
 */
async function interactiveMode(profileUrl: string): Promise<void> {
  const profileData = await getUpworkProfile(profileUrl);
  const context = formatProfileContext(profileData);
  
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });
  
  const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are a helpful assistant that analyzes Upwork freelancer profiles and provides insights about their skills, experience, and fit for projects."
    },
    {
      role: "user",
      content: `Here's the Upwork freelancer profile we'll be discussing:\n\n${context}\n\nI'll ask you questions about this profile.`
    },
    {
      role: "assistant",
      content: "I've reviewed the profile. Feel free to ask me any questions about this freelancer's skills, experience, or fit for your project!"
    }
  ];
  
  console.log('💬 Interactive mode started. Type your questions (or "exit" to quit)\n');
  
  // Simple readline for demo - replace with actual input handling in your app
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = () => {
    rl.question('You: ', async (question: string) => {
      if (question.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }
      
      conversationHistory.push({
        role: "user",
        content: question
      });
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 1500,
        stream: true,
      });
      
      process.stdout.write('Assistant: ');
      let assistantResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        assistantResponse += content;
        process.stdout.write(content);
      }
      
      console.log('\n');
      
      conversationHistory.push({
        role: "assistant",
        content: assistantResponse
      });
      
      askQuestion();
    });
  };
  
  askQuestion();
}

// Main execution
async function main() {
  console.log('🚀 Upwork Profile Analyzer\n');
  console.log('═'.repeat(60) + '\n');
  
  // Check environment variables
  if (!PILOTERR_API_KEY) {
    console.error('❌ PILOTERR_API_KEY not found in environment variables');
    console.log('\n💡 To fix this:');
    console.log('1. Create a .env.local file in your project root');
    console.log('2. Add: PILOTERR_API_KEY=your_key_here');
    console.log('3. Get your key from: https://piloterr.com/register\n');
    process.exit(1);
  }
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('\n💡 To fix this:');
    console.log('1. Add to .env.local: OPENAI_API_KEY=your_key_here');
    console.log('2. Get your key from: https://platform.openai.com/api-keys\n');
    process.exit(1);
  }
  
  console.log('⚠️  IMPORTANT: Upwork Talent API is a PRIVATE endpoint');
  console.log('📝 Request access at: https://www.piloterr.com/library/upwork-talent');
  console.log('✅ After approval, you can use this script\n');
  console.log('═'.repeat(60) + '\n');
  
  // Example profile URL - replace with actual URL
  const profileUrl = "https://www.upwork.com/freelancers/~01776549fb40f2f182";
  
  try {
    // Test with Upwork Talent API (requires approval)
    console.log('📝 Attempting to fetch Upwork profile...\n');
    const answer = await chatAboutProfile(
      profileUrl, 
      "What are this freelancer's main technical skills?"
    );
    console.log('Answer:');
    console.log(answer);
  } catch (error: any) {
    if (error.message.includes('403') || error.message.includes('401')) {
      console.log('\n❌ Access denied to Upwork Talent API');
      console.log('📝 Request access at: https://www.piloterr.com/library/upwork-talent');
      console.log('✅ You\'ll get 50 free requests after approval\n');
    } else {
      throw error;
    }
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

export {
  getUpworkProfile,
  chatAboutProfile,
  chatAboutProfileStreaming,
  interactiveMode,
  formatProfileContext,
  type UpworkProfile,
};