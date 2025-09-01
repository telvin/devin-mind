# Workflow Guidelines

This document provides comprehensive guidance on how to structure and format workflows in Devin Mind. Each workflow step can contain various attributes that control execution behavior, dependencies, and handoff mechanisms.

## Workflow Structure Overview

Workflows are defined in Markdown format where each step is represented as a level 2 heading (`## Step Name`). Each step can contain multiple attributes that define its behavior and requirements.

## Step Attributes Reference

### **Playbook ID**

**Purpose:** Specifies which Devin playbook to use for this step.

**Format:**
```markdown
**Playbook ID:** your-playbook-id-here
```

**Use Cases:**
- When you want to use a specific pre-configured playbook for consistent execution
- For standardized tasks that have been previously optimized in a playbook
- To leverage existing playbook configurations and settings

**Example:**
```markdown
## Step 1: Setup Environment
**Playbook ID:** nodejs-setup-v2
**Prompt:** Initialize a new Node.js project with TypeScript
```

### **RelyPreviousStep**

**Purpose:** Defines dependencies on previous workflow steps and specifies what data/results to use.

**Format:**
```markdown
**RelyPreviousStep:** [step-name] - [description of what to use]
```

**Use Cases:**
- When the current step needs output or results from a previous step
- For sequential workflows where each step builds upon previous ones
- To pass specific files, configurations, or data between steps
- To ensure proper execution order and dependencies

**Examples:**
```markdown
## Step 2: Add Features
**RelyPreviousStep:** Step 1 - Use the project structure and package.json created
**Prompt:** Add authentication middleware to the Express server

## Step 3: Testing
**RelyPreviousStep:** Step 2 - Use the authentication code and test the login functionality
**Prompt:** Write comprehensive tests for the authentication system
```

### **Prompt**

**Purpose:** The main instruction or task description that will be sent to Devin AI.

**Format:**
```markdown
**Prompt:** [Detailed task description]
```

**Use Cases:**
- Define the specific task or goal for the step
- Provide context and requirements for Devin to execute
- Include technical specifications, constraints, or preferences
- Reference files, frameworks, or methodologies to use

**Best Practices:**
- Be specific and clear about the expected outcome
- Include relevant technical details and constraints
- Mention specific files or directories to work with
- Specify coding standards or patterns to follow

**Examples:**
```markdown
**Prompt:** Create a React component for user authentication with email/password login, including form validation and error handling

**Prompt:** Implement a RESTful API endpoint for user registration using Express.js and MongoDB, with input validation and password hashing

**Prompt:** Write unit tests for the authentication service using Jest, ensuring 90% code coverage
```

### **Handoff**

**Purpose:** Describes what will be delivered or completed when this step finishes, used for the next step or final output.

**Format:**
```markdown
**Handoff:** [Description of deliverables and outcomes]
```

**Use Cases:**
- Define clear deliverables for the step
- Specify what files, configurations, or functionality will be ready
- Provide context for subsequent steps about what they can expect
- Document the state of the project after step completion

**Examples:**
```markdown
**Handoff:** Complete authentication system with login/logout functionality, user session management, and protected routes

**Handoff:** Fully configured CI/CD pipeline with automated testing, code quality checks, and deployment to staging environment

**Handoff:** Database schema implemented with user tables, relationships, and sample data for testing
```

## Complete Step Example

```markdown
## Step 2: Implement User Authentication

**Playbook ID:** security-auth-v1
**RelyPreviousStep:** Step 1 - Use the Express server setup and database connection
**Prompt:** Implement a complete user authentication system with the following requirements:
- JWT-based authentication
- Password hashing using bcrypt
- Login and registration endpoints
- Middleware for protecting routes
- Input validation and error handling
- Integration with the MongoDB user collection created in Step 1

**Handoff:** Working authentication system with secure login/registration endpoints, JWT token generation, protected route middleware, and proper error handling. All authentication routes tested and documented.
```

## Optional Attributes

### **Timeout**
Specify custom timeout for this specific step:
```markdown
**Timeout:** 600
```

### **Priority**
Set execution priority (for parallel workflows):
```markdown
**Priority:** high
```

### **Tags**
Add tags for organization and filtering:
```markdown
**Tags:** frontend, react, components
```

### **Notes**
Additional context or reminders:
```markdown
**Notes:** This step requires the API key to be configured in environment variables
```

## Workflow Best Practices

### 1. **Clear Step Names**
Use descriptive names that clearly indicate what the step accomplishes:
- ✅ "Setup Database Schema and Models"
- ❌ "Database Stuff"

### 2. **Logical Dependencies**
Structure `RelyPreviousStep` to create clear dependency chains:
```markdown
Step 1: Project Setup → Step 2: Core Features → Step 3: Testing → Step 4: Deployment
```

### 3. **Specific Prompts**
Write detailed prompts that leave no ambiguity:
- Include specific technologies, frameworks, or libraries
- Mention file locations and naming conventions
- Specify coding standards and best practices

### 4. **Clear Handoffs**
Define handoffs that make it easy for the next step to continue:
- List specific files that will be created or modified
- Describe the functionality that will be available
- Mention any configuration or setup that will be complete

### 5. **Playbook Consistency**
Use consistent playbook IDs across similar tasks:
- `frontend-react-v1` for React-based frontend tasks
- `backend-node-v2` for Node.js backend development
- `testing-jest-v1` for Jest-based testing

## Example Complete Workflow

```markdown
# E-commerce Application Development

## Step 1: Project Foundation
**Playbook ID:** fullstack-setup-v1
**Prompt:** Create a new full-stack e-commerce application with React frontend, Node.js/Express backend, and MongoDB database. Set up the basic project structure, package.json files, and development environment.
**Handoff:** Complete project structure with frontend and backend folders, package.json configured, basic Express server running, and MongoDB connection established.

## Step 2: User Authentication System
**Playbook ID:** auth-security-v2
**RelyPreviousStep:** Step 1 - Use the backend server setup and database connection
**Prompt:** Implement comprehensive user authentication including registration, login, JWT tokens, password hashing, and protected routes middleware.
**Handoff:** Working authentication system with secure endpoints, JWT implementation, and route protection ready for integration.

## Step 3: Product Management
**RelyPreviousStep:** Step 2 - Use the authentication middleware and user models
**Prompt:** Create product management functionality including CRUD operations for products, categories, inventory tracking, and admin-only product creation routes.
**Handoff:** Complete product management API with database models, CRUD endpoints, and proper authorization checks.

## Step 4: Frontend Components
**Playbook ID:** react-ecommerce-v1
**RelyPreviousStep:** Step 3 - Use the authentication and product APIs
**Prompt:** Build React frontend components for user login, product catalog, shopping cart, and checkout process. Integrate with the backend APIs.
**Handoff:** Fully functional e-commerce frontend with user authentication, product browsing, and shopping cart functionality.
```

This structure ensures clear communication between steps, proper dependency management, and successful workflow execution across multiple Devin sessions.