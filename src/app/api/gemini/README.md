# Gemini API for Playwright

This unified API provides functions to analyze and create test steps using Google Gemini AI.

## Endpoint

```
POST /api/gemini/playwright
```

## Supported Actions

This API supports 3 main actions:

1. `analyze`: Analyze Playwright code and convert it to test steps
2. `generate`: Create test steps from descriptions or information
3. `enhance`: Enhance existing test steps with HTML context

## Usage Examples

### 1. Analyze Playwright Code

```typescript
const response = await fetch("/api/gemini/playwright", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "analyze",
    playwrightCode: `
      await page.goto('https://example.com');
      await page.getByRole('textbox', { name: 'Username' }).fill('student');
      await page.getByRole('button', { name: 'Login' }).click();
    `,
  }),
});

const result = await response.json();
console.log(result.testSteps);
```

### 2. Generate Test Step from Description

```typescript
const response = await fetch("/api/gemini/playwright", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "generate",
    description: 'Enter username "admin" into the login field',
  }),
});

const result = await response.json();
console.log(result.testStep);
```

### 3. Generate Test Step from Detailed Information

```typescript
const response = await fetch("/api/gemini/playwright", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "generate",
    testStep: {
      action: "fill",
      selector: 'input[name="username"]',
      data: "admin",
    },
  }),
});

const result = await response.json();
console.log(result.testStep);
```

### 4. Enhance Test Step with HTML Context

```typescript
const response = await fetch("/api/gemini/playwright", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "enhance",
    testStep: {
      action: "click",
      selector: "#submit-btn",
    },
    htmlContext: '<button id="submit-btn" type="submit">Login</button>',
  }),
});

const result = await response.json();
console.log(result.testStep);
```

## Response

### Analyzing Playwright Code

```json
{
  "success": true,
  "testSteps": [
    {
      "action": "Navigate to website",
      "data": "https://example.com",
      "expected": "Website https://example.com is loaded",
      "selector": "URL"
    },
    {
      "action": "Enter text into username field",
      "data": "student",
      "expected": "Text 'student' is entered into username field",
      "selector": "Username textbox"
    },
    {
      "action": "Click the login button",
      "data": null,
      "expected": "Form is submitted",
      "selector": "Login button"
    }
  ]
}
```

### Generate/Enhance Test Step

```json
{
  "success": true,
  "testStep": {
    "action": "Enter text into username field",
    "selector": "input[name=username]",
    "data": "admin",
    "expected": "Username field contains 'admin'",
    "command": "await page.fill('input[name=username]', 'admin');",
    "geminiEnhanced": true
  }
}
```
