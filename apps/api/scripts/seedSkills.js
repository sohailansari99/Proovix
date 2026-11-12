require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Skill = require("../src/modules/skills/skill.model");
const env = require("../src/config/env");

const skillsData = [
  // FRONTEND track
  {
    name: "HTML",
    slug: "html",
    category: "Markup",
    description: "The standard markup language for creating web pages",
    track: "FRONTEND",
    competencies: [
      "Semantic HTML5 elements",
      "Forms and form validation",
      "Accessibility (ARIA and WCAG)",
      "SEO fundamentals",
      "Responsive layout basics",
      "Document Object Model structure",
      "Embedding media and assets"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "CSS",
    slug: "css",
    category: "Styling",
    description: "Style sheets for describing the presentation of a document written in HTML",
    track: "FRONTEND",
    competencies: [
      "Selectors, specificity, and cascading",
      "Box model and sizing",
      "Flexbox layout system",
      "CSS Grid layout system",
      "Responsive design with media queries",
      "Animations and transitions",
      "Modern CSS variables and nesting"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "JavaScript",
    slug: "javascript",
    category: "Programming",
    description: "High-level programming language used for web development",
    track: "FRONTEND",
    competencies: [
      "ES6+ syntax and features",
      "DOM manipulation and events",
      "Asynchronous programming (Promises, async/await)",
      "Closures, scopes, and hoisting",
      "Array methods and iterators",
      "Module systems (CommonJS/ES Modules)",
      "Error handling and debugging"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "React",
    slug: "react",
    category: "UI Library",
    description: "JavaScript library for building user interfaces",
    track: "FRONTEND",
    competencies: [
      "Component architecture and JSX",
      "State management (useState, useReducer)",
      "Effect synchronization (useEffect)",
      "Context API",
      "Component lifecycle and composition",
      "React Router",
      "Performance optimization (memo, useCallback)"
    ],
    version: 1,
    isActive: true,
  },

  // BACKEND track
  {
    name: "Node.js",
    slug: "nodejs",
    category: "Runtime",
    description: "JavaScript runtime for building server-side applications",
    track: "BACKEND",
    competencies: [
      "Event loop and non-blocking I/O",
      "Buffer and stream handling",
      "File system operations",
      "Process management and environment variables",
      "Package management and security (npm/yarn)",
      "Testing with Jest/Mocha",
      "Performance monitoring"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "Express",
    slug: "express",
    category: "Web Framework",
    description: "Minimalist web framework for Node.js",
    track: "BACKEND",
    competencies: [
      "Middleware architecture",
      "Request/Response lifecycle",
      "Routing and URL parameters",
      "Authentication strategies (JWT/Passport)",
      "Error handling and logging middleware",
      "Template engines and static files",
      "API documentation (Swagger/OpenAPI)"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "MongoDB",
    slug: "mongodb",
    category: "Database",
    description: "NoSQL document database",
    track: "BACKEND",
    competencies: [
      "BSON document structure",
      "Collection operations (CRUD)",
      "Indexing strategies",
      "Aggregation pipeline",
      "Data modeling and references",
      "Transactions and sessions",
      "Security and access control"
    ],
    version: 1,
    isActive: true,
  },
  {
    name: "REST API design",
    slug: "rest-api-design",
    category: "Architecture",
    description: "Designing scalable and consistent RESTful APIs",
    track: "BACKEND",
    competencies: [
      "HTTP methods and semantics",
      "Status code standards",
      "Resource URI design",
      "Version control strategies",
      "Rate limiting and throttling",
      "API security and authorization",
      "Pagination and filtering"
    ],
    version: 1,
    isActive: true,
  },
];

const seedSkills = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    // Upsert skills
    for (const skill of skillsData) {
      await Skill.updateOne(
        { slug: skill.slug },
        { $set: skill },
        { upsert: true }
      );
      console.log(`Upserted: ${skill.name}`);
    }

    console.log(`Successfully processed ${skillsData.length} skills`);
  } catch (error) {
    console.error("Error seeding skills:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

if (require.main === module) {
  seedSkills();
}

module.exports = seedSkills;
