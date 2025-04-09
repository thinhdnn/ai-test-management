import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);
const prisma = new PrismaClient();

// API key for authentication - ideally should be in environment variables
const API_KEY = process.env.DATABASE_API_KEY || 'playwright-gemini-secret-key-change-in-production';

// Validate API key from request headers
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  console.log(`[Database API] Received API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'Not provided'}`);
  const isValid = apiKey === API_KEY;
  console.log(`[Database API] API key validation: ${isValid ? 'Success' : 'Failed'}`);
  return isValid;
}

// Reset the entire database
async function resetDatabase() {
  try {
    // Delete contents of playwright-projects folder
    await execPromise('rm -rf playwright-projects/*');
    
    // Reset the database using Prisma
    await execPromise('npx prisma db push --force-reset');
    
    // Generate Prisma client
    await execPromise('npx prisma generate');
    
    // Seed the database
    await execPromise('npm run prisma:seed');
    
    // Seed permissions and roles
    await execPromise('node prisma/seed-permissions.js');
    await execPromise('node prisma/seed-roles.js');
    
    return {
      success: true,
      message: 'Database reset complete. You can now log in with admin user (admin/admin123) or regular user (user/user123)'
    };
  } catch (error: any) {
    console.error('Reset database error:', error);
    return {
      success: false,
      message: `Failed to reset database: ${error.message}`
    };
  }
}

// Delete a specific project by ID
async function deleteProject(projectId: string) {
  try {
    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { testCases: true }
    });
    
    if (!project) {
      return {
        success: false,
        message: `Project with ID ${projectId} not found`
      };
    }
    
    // Delete the project
    const result = await prisma.project.delete({
      where: { id: projectId }
    });
    
    return {
      success: true,
      message: `Successfully deleted project: ${result.name}`
    };
  } catch (error: any) {
    console.error('Delete project error:', error);
    return {
      success: false,
      message: `Failed to delete project: ${error.message}`
    };
  }
}

// Delete a specific test case by ID
async function deleteTestCase(testId: string) {
  try {
    // Check if the test case exists
    const testCase = await prisma.testCase.findUnique({
      where: { id: testId },
      include: { testSteps: true, project: true }
    });
    
    if (!testCase) {
      return {
        success: false,
        message: `Test case with ID ${testId} not found`
      };
    }
    
    // Delete the test case
    const result = await prisma.testCase.delete({
      where: { id: testId }
    });
    
    return {
      success: true,
      message: `Successfully deleted test case: ${result.name}`
    };
  } catch (error: any) {
    console.error('Delete test case error:', error);
    return {
      success: false,
      message: `Failed to delete test case: ${error.message}`
    };
  }
}

// List all projects and test cases
async function listItems() {
  try {
    // Get all projects with their test cases
    const projects = await prisma.project.findMany({
      include: { 
        testCases: {
          include: {
            testSteps: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return {
      success: true,
      data: projects
    };
  } catch (error: any) {
    console.error('List items error:', error);
    return {
      success: false,
      message: `Failed to list items: ${error.message}`
    };
  }
}

// API Endpoint: POST /api/database
export async function POST(req: NextRequest) {
  // Check API key authentication
  if (!validateApiKey(req)) {
    return NextResponse.json(
      { error: 'Access denied', message: 'Invalid or missing API key' },
      { status: 403 }
    );
  }

  try {
    const { action, projectId, testId } = await req.json();

    let result;
    
    switch (action) {
      case 'reset':
        result = await resetDatabase();
        break;
      case 'deleteProject':
        if (!projectId) {
          return NextResponse.json(
            { error: 'Project ID is required' },
            { status: 400 }
          );
        }
        result = await deleteProject(projectId);
        break;
      case 'deleteTestCase':
        if (!testId) {
          return NextResponse.json(
            { error: 'Test case ID is required' },
            { status: 400 }
          );
        }
        result = await deleteTestCase(testId);
        break;
      case 'list':
        result = await listItems();
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: reset, deleteProject, deleteTestCase, list' },
          { status: 400 }
        );
    }
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 