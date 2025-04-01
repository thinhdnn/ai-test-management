# Playwright Gemini

A modern test automation management platform that combines the power of Playwright with AI assistance for efficient test case creation and management.

## 🌟 Key Features

- **Project Management**
  - Create and organize test projects
  - Configure project settings (URL, browser, environment)
  - Manage test case collections
  - Track project status and history

- **Test Case Management**
  - Create and edit test cases with detailed steps
  - Support for manual and automated test cases
  - Version control for test cases
  - Tag-based organization system
  - Clone and reuse test cases

- **Playwright Integration**
  - Generate Playwright test scripts automatically
  - Execute tests directly from the UI
  - View detailed test results and reports
  - Support for multiple browsers
  - Custom fixture management

- **AI-Powered Features**
  - Generate test steps using Gemini AI
  - Smart test step suggestions
  - Automatic code generation
  - Natural language processing for test descriptions

## 🛠️ Tech Stack

- **Frontend**
  - Next.js 14 (App Router)
  - React
  - Tailwind CSS
  - Shadcn UI Components
  - TypeScript

- **Backend**
  - Next.js API Routes
  - Prisma ORM
  - SQLite Database
  - JWT Authentication

- **Testing**
  - Playwright
  - Gemini AI Integration

## 📦 Installation

1. **Clone the Repository**
```bash
git clone https://github.com/thinhdnn/ai-test-management.git
cd ai-test-management
```

2. **Install Dependencies**
```bash
npm install
```

3. **Set Up Environment Variables**
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

4. **Initialize Database**
```bash
./reset-db.sh --reset
```

5. **Start Development Server**
```bash
npm run dev
```

6. **Access the Application**
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
ai-test-management/
├── src/
│   ├── app/
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth/           # Authentication
│   │   │   ├── projects/       # Project management
│   │   │   └── tags/          # Tag management
│   │   ├── projects/           # Project pages
│   │   │   └── [id]/          # Project details
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   └── shared/           # Shared components
│   └── lib/
│       ├── auth-utils.ts      # Authentication utilities
│       ├── playwright-service.ts # Playwright integration
│       └── ai-service.ts      # AI service integration
├── prisma/
│   └── schema.prisma         # Database schema
├── playwright-projects/      # Generated test projects
└── public/                  # Static assets
```

## 🔑 Key Features in Detail

### Project Management
- Create and configure test projects
- Set up project-specific settings
- Manage test environments
- Track project progress

### Test Case Management
- Create detailed test cases
- Add step-by-step instructions
- Support for tags and categorization
- Version control for test cases
- Clone and modify existing test cases

### Playwright Integration
- Automatic test script generation
- Custom fixture support
- Multiple browser testing
- Detailed test reports
- Screenshot and video capture

### AI Integration
- Smart test step generation
- Code suggestions
- Natural language processing
- Automated script optimization

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Playwright Documentation](https://playwright.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Gemini AI Documentation](https://ai.google.dev/docs)
