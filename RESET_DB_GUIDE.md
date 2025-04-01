# Database Reset Tool Guide

The `reset-db.sh` script provides multiple features for managing the Prisma database of your Playwright Gemini application, including resetting the entire database, deleting specific projects or test cases.

## Features

This script can:

1. Display help information
2. Reset the entire database and create sample data
3. Delete a specific project by ID
4. Delete a specific test case by ID
5. List all existing projects and test cases

## How to Use

### Grant execution permission

Before using the script, you need to grant execution permission:

```bash
chmod +x reset-db.sh
```

### Available Commands

| Command                                | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| `./reset-db.sh --help`                 | Display help information                         |
| `./reset-db.sh --reset`                | Reset the entire database and create sample data |
| `./reset-db.sh --project <project_id>` | Delete a project by ID                           |
| `./reset-db.sh --test-case <test_id>`  | Delete a test case by ID                         |
| `./reset-db.sh --list`                 | List all projects and test cases                 |

### Examples

1. **Reset the entire database**:

   ```bash
   ./reset-db.sh --reset
   ```

   When using this command, the script will:

   - Delete the entire current database
   - Apply all migrations
   - Create initial sample data (admin user, regular user, default settings, sample projects)

2. **List all projects and test cases**:

   ```bash
   ./reset-db.sh --list
   ```

   This command will display a list of all projects and test cases in the database, including:

   - Project and test case IDs (necessary for delete commands)
   - Project names, URLs, environments
   - Test case names, statuses, and number of steps

3. **Delete a specific project**:

   ```bash
   ./reset-db.sh --project 517ade58-064f-4fc1-9482-1bc02ddc2c37
   ```

   This command will:

   - Find the project with the provided ID
   - Delete that project and all related test cases and test steps (cascade delete)
   - Display information about the deleted project

4. **Delete a specific test case**:

   ```bash
   ./reset-db.sh --test-case 5776f0fb-bbab-40fe-96b4-52b2c464e2d8
   ```

   This command will:

   - Find the test case with the provided ID
   - Delete the test case and all related test steps (cascade delete)
   - Display information about the deleted test case

## Important Notes

1. The `--reset` command will **delete all existing data**. Make sure you have backed up important data before using it.

2. Project and test case delete commands are **irreversible**. Please double-check the ID before proceeding.

3. Use the `--list` command to get the exact ID of a project or test case before deleting.

4. After resetting the database, you can log in with:
   - Admin account: username `admin`, password `admin123`
   - User account: username `user`, password `user123`
