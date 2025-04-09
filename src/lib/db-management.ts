/**
 * Database Management Utility Functions
 * 
 * This file contains utility functions to interact with the database management API
 */

// API key for database management
const API_KEY = process.env.NEXT_PUBLIC_DATABASE_API_KEY || 'playwright-gemini-secret-key-change-in-production';

/**
 * Reset the entire database
 * @returns Promise<any> The response from the API
 */
export async function resetDatabase(): Promise<any> {
  return callDatabaseApi('reset');
}

/**
 * Delete a specific project by ID
 * @param projectId The ID of the project to delete
 * @returns Promise<any> The response from the API
 */
export async function deleteProject(projectId: string): Promise<any> {
  return callDatabaseApi('deleteProject', { projectId });
}

/**
 * Delete a specific test case by ID
 * @param testId The ID of the test case to delete
 * @returns Promise<any> The response from the API
 */
export async function deleteTestCase(testId: string): Promise<any> {
  return callDatabaseApi('deleteTestCase', { testId });
}

/**
 * List all projects and test cases
 * @returns Promise<any> The response from the API
 */
export async function listItems(): Promise<any> {
  return callDatabaseApi('list');
}

/**
 * Helper function to call the database API
 * @param action The action to perform (reset, deleteProject, deleteTestCase, list)
 * @param params Additional parameters for the action
 * @returns Promise<any> The response from the API
 */
async function callDatabaseApi(action: string, params: Record<string, any> = {}): Promise<any> {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        action,
        ...params,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to perform database operation');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Database API error:', error);
    throw error;
  }
} 