// ============================================================================
// SKILL ALIAS DICTIONARY
// ============================================================================
// Maps various skill name variations to their canonical form.
// This is a deterministic, explicit mapping - NO AI, NO heuristics.
//
// RULES:
// 1. All canonical names are lowercase, no spaces, no dots
// 2. Aliases include common variations (casing, abbreviations, versions)
// 3. Unknown skills are normalized to lowercase with special chars removed
// 4. The mapping is EXHAUSTIVE for common tech skills
//
// To add a new skill:
// 1. Add the canonical name as key
// 2. List ALL known variations as aliases
// ============================================================================

/**
 * Skill alias dictionary.
 * Key = canonical name (lowercase, no spaces/dots)
 * Value = array of aliases (case-insensitive matching)
 */
export const SKILL_ALIASES: Record<string, string[]> = {
  // ---- JavaScript Ecosystem ----
  javascript: [
    "javascript",
    "js",
    "ecmascript",
    "es6",
    "es2015",
    "es2016",
    "es2017",
    "es2018",
    "es2019",
    "es2020",
    "es2021",
    "es2022",
    "es2023",
    "vanilla js",
    "vanilla javascript",
  ],
  typescript: [
    "typescript",
    "ts",
    "type script",
  ],
  nodejs: [
    "nodejs",
    "node.js",
    "node js",
    "node",
  ],
  react: [
    "react",
    "reactjs",
    "react.js",
    "react js",
  ],
  nextjs: [
    "nextjs",
    "next.js",
    "next js",
    "next",
  ],
  vue: [
    "vue",
    "vuejs",
    "vue.js",
    "vue js",
    "vue2",
    "vue3",
  ],
  nuxt: [
    "nuxt",
    "nuxtjs",
    "nuxt.js",
    "nuxt js",
  ],
  angular: [
    "angular",
    "angularjs",
    "angular.js",
    "angular js",
    "angular2",
    "angular 2",
  ],
  svelte: [
    "svelte",
    "sveltejs",
    "svelte.js",
  ],
  express: [
    "express",
    "expressjs",
    "express.js",
  ],
  nestjs: [
    "nestjs",
    "nest.js",
    "nest js",
    "nest",
  ],
  deno: [
    "deno",
    "denojs",
  ],
  bun: [
    "bun",
    "bunjs",
  ],

  // ---- CSS / Styling ----
  css: [
    "css",
    "css3",
    "cascading style sheets",
  ],
  sass: [
    "sass",
    "scss",
  ],
  less: [
    "less",
    "lesscss",
  ],
  tailwindcss: [
    "tailwindcss",
    "tailwind css",
    "tailwind",
  ],
  bootstrap: [
    "bootstrap",
    "bootstrap5",
    "bootstrap4",
    "bootstrap 5",
    "bootstrap 4",
  ],
  styledcomponents: [
    "styledcomponents",
    "styled-components",
    "styled components",
  ],
  emotion: [
    "emotion",
    "@emotion",
  ],

  // ---- Python Ecosystem ----
  python: [
    "python",
    "python3",
    "python2",
    "py",
  ],
  django: [
    "django",
    "django rest framework",
    "drf",
  ],
  flask: [
    "flask",
  ],
  fastapi: [
    "fastapi",
    "fast api",
  ],
  pandas: [
    "pandas",
  ],
  numpy: [
    "numpy",
  ],
  pytorch: [
    "pytorch",
    "torch",
  ],
  tensorflow: [
    "tensorflow",
  ],
  scikitlearn: [
    "scikitlearn",
    "scikit-learn",
    "scikit learn",
    "sklearn",
  ],

  // ---- Databases ----
  postgresql: [
    "postgresql",
    "postgres",
    "pg",
    "psql",
  ],
  mysql: [
    "mysql",
    "mariadb",
  ],
  mongodb: [
    "mongodb",
    "mongo",
  ],
  redis: [
    "redis",
  ],
  elasticsearch: [
    "elasticsearch",
    "elastic search",
    "elastic",
    "es",
  ],
  sqlite: [
    "sqlite",
    "sqlite3",
  ],
  supabase: [
    "supabase",
  ],
  firebase: [
    "firebase",
    "firestore",
  ],
  dynamodb: [
    "dynamodb",
    "dynamo db",
    "dynamo",
  ],
  cassandra: [
    "cassandra",
    "apache cassandra",
  ],

  // ---- ORMs / Query Builders ----
  prisma: [
    "prisma",
    "prisma orm",
  ],
  drizzle: [
    "drizzle",
    "drizzle orm",
  ],
  typeorm: [
    "typeorm",
    "type orm",
  ],
  sequelize: [
    "sequelize",
  ],
  knex: [
    "knex",
    "knexjs",
  ],
  sqlalchemy: [
    "sqlalchemy",
    "sql alchemy",
  ],

  // ---- Cloud Platforms ----
  aws: [
    "aws",
    "amazon web services",
    "amazon aws",
  ],
  gcp: [
    "gcp",
    "google cloud",
    "google cloud platform",
  ],
  azure: [
    "azure",
    "microsoft azure",
    "ms azure",
  ],
  vercel: [
    "vercel",
  ],
  netlify: [
    "netlify",
  ],
  heroku: [
    "heroku",
  ],
  digitalocean: [
    "digitalocean",
    "digital ocean",
    "do",
  ],
  cloudflare: [
    "cloudflare",
    "cloud flare",
  ],

  // ---- DevOps / Infrastructure ----
  docker: [
    "docker",
    "dockerfile",
    "docker-compose",
    "docker compose",
  ],
  kubernetes: [
    "kubernetes",
    "k8s",
    "kube",
  ],
  terraform: [
    "terraform",
    "tf",
  ],
  ansible: [
    "ansible",
  ],
  jenkins: [
    "jenkins",
  ],
  githubactions: [
    "githubactions",
    "github actions",
    "github-actions",
  ],
  gitlab: [
    "gitlab",
    "gitlab ci",
    "gitlab-ci",
  ],
  circleci: [
    "circleci",
    "circle ci",
  ],

  // ---- Version Control ----
  git: [
    "git",
    "gitlab",
    "bitbucket",
  ],

  // ---- Testing ----
  jest: [
    "jest",
  ],
  vitest: [
    "vitest",
  ],
  mocha: [
    "mocha",
  ],
  cypress: [
    "cypress",
    "cypress.io",
  ],
  playwright: [
    "playwright",
  ],
  selenium: [
    "selenium",
    "selenium webdriver",
  ],
  pytest: [
    "pytest",
  ],

  // ---- APIs / Protocols ----
  rest: [
    "rest",
    "restful",
    "rest api",
    "restful api",
  ],
  graphql: [
    "graphql",
    "graph ql",
    "gql",
  ],
  grpc: [
    "grpc",
    "g-rpc",
  ],
  websocket: [
    "websocket",
    "websockets",
    "ws",
    "socket.io",
    "socketio",
  ],
  trpc: [
    "trpc",
    "t-rpc",
  ],

  // ---- Mobile ----
  reactnative: [
    "reactnative",
    "react native",
    "react-native",
    "rn",
  ],
  flutter: [
    "flutter",
  ],
  swift: [
    "swift",
    "swiftui",
  ],
  kotlin: [
    "kotlin",
  ],
  ios: [
    "ios",
    "iphone",
    "ipad",
  ],
  android: [
    "android",
  ],

  // ---- Other Languages ----
  java: [
    "java",
    "java8",
    "java11",
    "java17",
  ],
  csharp: [
    "csharp",
    "c#",
    "c sharp",
    "dotnet",
    ".net",
    "asp.net",
  ],
  go: [
    "go",
    "golang",
  ],
  rust: [
    "rust",
    "rustlang",
  ],
  ruby: [
    "ruby",
    "rails",
    "ruby on rails",
    "ror",
  ],
  php: [
    "php",
    "laravel",
    "symfony",
  ],
  scala: [
    "scala",
  ],
  elixir: [
    "elixir",
    "phoenix",
  ],
  clojure: [
    "clojure",
    "clojurescript",
  ],
  haskell: [
    "haskell",
  ],
  cpp: [
    "cpp",
    "c++",
    "cplusplus",
  ],
  c: [
    "c",
    "c language",
  ],

  // ---- AI / ML ----
  machinelearning: [
    "machinelearning",
    "machine learning",
    "ml",
  ],
  deeplearning: [
    "deeplearning",
    "deep learning",
    "dl",
  ],
  nlp: [
    "nlp",
    "natural language processing",
  ],
  computervision: [
    "computervision",
    "computer vision",
    "cv",
  ],
  openai: [
    "openai",
    "chatgpt",
    "gpt",
    "gpt-4",
    "gpt-3",
  ],
  langchain: [
    "langchain",
    "lang chain",
  ],

  // ---- Data / Analytics ----
  sql: [
    "sql",
    "structured query language",
  ],
  dataanalysis: [
    "dataanalysis",
    "data analysis",
    "data analytics",
  ],
  dataengineering: [
    "dataengineering",
    "data engineering",
  ],
  etl: [
    "etl",
    "extract transform load",
  ],
  tableau: [
    "tableau",
  ],
  powerbi: [
    "powerbi",
    "power bi",
  ],
  looker: [
    "looker",
  ],
  dbt: [
    "dbt",
    "data build tool",
  ],
  airflow: [
    "airflow",
    "apache airflow",
  ],
  spark: [
    "spark",
    "apache spark",
    "pyspark",
  ],
  kafka: [
    "kafka",
    "apache kafka",
  ],

  // ---- Design / UX ----
  figma: [
    "figma",
  ],
  sketch: [
    "sketch",
  ],
  adobexd: [
    "adobexd",
    "adobe xd",
    "xd",
  ],
  ui: [
    "ui",
    "ui design",
    "user interface",
  ],
  ux: [
    "ux",
    "ux design",
    "user experience",
  ],

  // ---- Soft Skills (included for completeness) ----
  agile: [
    "agile",
    "scrum",
    "kanban",
    "agile methodology",
  ],
  leadership: [
    "leadership",
    "team lead",
    "tech lead",
  ],
  communication: [
    "communication",
    "written communication",
    "verbal communication",
  ],
};

/**
 * Reverse lookup map: alias → canonical name
 * Built at module load time for O(1) lookups
 */
export const ALIAS_TO_CANONICAL: Map<string, string> = new Map();

// Build the reverse lookup map
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
  }
}

/**
 * Normalizes a skill name to its canonical form.
 *
 * RULES (applied in order):
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Look up in alias dictionary
 * 4. If found, return canonical name
 * 5. If not found, return sanitized version (lowercase, alphanumeric only)
 *
 * @param skillName - Raw skill name from user input
 * @returns Canonical skill name
 *
 * @example
 * toCanonicalSkillName("Next.js")     // "nextjs"
 * toCanonicalSkillName("REACT")       // "react"
 * toCanonicalSkillName("Node JS")     // "nodejs"
 * toCanonicalSkillName("My Custom Skill") // "mycustomskill"
 */
export function toCanonicalSkillName(skillName: string): string {
  // Step 1-2: Trim and lowercase
  const normalized = skillName.trim().toLowerCase();

  // Step 3-4: Look up in alias dictionary
  const canonical = ALIAS_TO_CANONICAL.get(normalized);
  if (canonical) {
    return canonical;
  }

  // Step 5: Sanitize unknown skills
  // Remove all non-alphanumeric characters
  return normalized.replace(/[^a-z0-9]/g, "");
}

/**
 * Gets the display name for a canonical skill.
 * Returns the first alias as the "official" display name.
 *
 * @param canonicalName - Canonical skill name
 * @returns Display name or the canonical name if not found
 */
export function getSkillDisplayName(canonicalName: string): string {
  const aliases = SKILL_ALIASES[canonicalName];
  if (aliases && aliases.length > 0) {
    // Return a properly capitalized version
    // The first alias is typically the most common form
    return capitalizeSkillName(aliases[0]);
  }
  return capitalizeSkillName(canonicalName);
}

/**
 * Capitalizes a skill name properly.
 * Handles acronyms and common patterns.
 */
function capitalizeSkillName(name: string): string {
  // Known acronyms that should be uppercase
  const acronyms = new Set([
    "js",
    "ts",
    "css",
    "html",
    "sql",
    "api",
    "aws",
    "gcp",
    "ui",
    "ux",
    "ml",
    "ai",
    "nlp",
    "etl",
    "ci",
    "cd",
  ]);

  // Known patterns that need special casing
  const specialCases: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    nodejs: "Node.js",
    nextjs: "Next.js",
    vuejs: "Vue.js",
    reactjs: "React",
    postgresql: "PostgreSQL",
    mongodb: "MongoDB",
    graphql: "GraphQL",
    mysql: "MySQL",
    sqlite: "SQLite",
    dynamodb: "DynamoDB",
    csharp: "C#",
    cpp: "C++",
    ios: "iOS",
    macos: "macOS",
    github: "GitHub",
    gitlab: "GitLab",
    bitbucket: "Bitbucket",
    linkedin: "LinkedIn",
    tailwindcss: "Tailwind CSS",
    openai: "OpenAI",
    chatgpt: "ChatGPT",
    fastapi: "FastAPI",
  };

  const lower = name.toLowerCase();

  // Check special cases first
  if (specialCases[lower]) {
    return specialCases[lower];
  }

  // Check if it's an acronym
  if (acronyms.has(lower)) {
    return name.toUpperCase();
  }

  // Default: capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
