# AI Test Management

![Alt Text](https://i.imgur.com/navSpr4.gif)

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
  - Generate test case name using AI
  - Generate test steps / fixtures using AI
  - Smart test step / fixtures suggestions
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
  - SQLite/Postgres Database
  - JWT Authentication

- **Testing**
  - Playwright
  - Gemini/GPT/Grok/Claude AI Integration

## 📦 Installation

1. **Clone the Repository**
```bash
git clone https://github.com/thinhdnn/ai-test-management
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

## 🚀 Deployment

### Deploying to Vercel

1. **Prepare Your Repository**
   - Push your code to GitHub
   - Make sure your `.env` file is properly configured
   - Ensure your database is ready for production

2. **Set Up Vercel**
   - Create an account on [Vercel](https://vercel.com)
   - Install Vercel CLI (optional):
     ```bash
     npm i -g vercel
     ```

3. **Configure Environment Variables**
   In your Vercel project settings, add the following environment variables:
   ```env
   DATABASE_URL="your-production-database-url"
   NEXTAUTH_URL="https://your-domain.vercel.app"
   NEXTAUTH_SECRET="your-production-secret"
   ```

4. **Deploy Options**

   **Option 1: Deploy via Vercel Dashboard**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure your environment variables
   - Click "Deploy"

   **Option 2: Deploy via CLI**
   ```bash
   # Login to Vercel
   vercel login

   # Deploy to production
   vercel --prod
   ```

5. **Post-Deployment Setup**
   - Set up your production database
   - Run database migrations:
     ```bash
     vercel env pull .env.production.local
     npx prisma db push
     ```
   - Verify your deployment is working correctly

### Important Notes

- Ensure your `DATABASE_URL` points to a production database (e.g., PostgreSQL on Supabase/Railway)
- Set a strong `NEXTAUTH_SECRET` for production
- Configure your domains and SSL certificates if using a custom domain
- Set up proper database backups and monitoring
