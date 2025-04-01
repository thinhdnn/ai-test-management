import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API để phân tích mã Playwright và tạo test step
 * 
 * POST /api/ai/analyze-code
 */
export async function POST(request: Request) {
  try {
    const { code, projectId, testCaseId } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // Phân tích mã để xác định các thành phần của test step
    let action = "Playwright Step";
    let data = code;
    let expected = "Step completes successfully";
    let selector = "";

    // Phân tích action dựa trên các pattern phổ biến
    if (code.includes(".click(")) {
      action = "Click Element";
      expected = "Element is clicked successfully";
      
      // Trích xuất selector từ mã click
      const clickMatch = code.match(/\.click\(\s*['"]([^'"]+)['"]\s*\)/);
      if (clickMatch && clickMatch[1]) {
        selector = clickMatch[1];
        data = `Click on selector: ${selector}`;
      } else {
        // Trích xuất selector từ định dạng page.locator
        const locatorMatch = code.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/);
        if (locatorMatch && locatorMatch[1]) {
          selector = locatorMatch[1];
          data = `Click on selector: ${selector}`;
        }
      }
    } else if (code.includes(".fill(") || code.includes(".type(")) {
      action = "Input Text";
      
      // Trích xuất selector và giá trị từ fill/type
      const fillMatch = code.match(/\.(fill|type)\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);
      if (fillMatch && fillMatch[2] && fillMatch[3]) {
        selector = fillMatch[2];
        const inputValue = fillMatch[3];
        data = inputValue;
        expected = `Text "${inputValue}" is entered successfully`;
      } else {
        // Trích xuất từ page.locator
        const locatorMatch = code.match(/locator\(\s*['"]([^'"]+)['"]\s*\)\s*\.(fill|type)\(\s*['"]([^'"]+)['"]\s*\)/);
        if (locatorMatch && locatorMatch[1] && locatorMatch[3]) {
          selector = locatorMatch[1];
          const inputValue = locatorMatch[3];
          data = inputValue;
          expected = `Text "${inputValue}" is entered successfully`;
        }
      }
    } else if (code.includes(".goto(")) {
      action = "Navigate";
      
      // Trích xuất URL từ goto
      const gotoMatch = code.match(/\.goto\(\s*['"]([^'"]+)['"]\s*\)/);
      if (gotoMatch && gotoMatch[1]) {
        const url = gotoMatch[1];
        data = url;
        expected = `Page navigates to "${url}" successfully`;
      }
    } else if (code.includes(".check(")) {
      action = "Check Checkbox";
      
      // Trích xuất selector từ check
      const checkMatch = code.match(/\.check\(\s*['"]([^'"]+)['"]\s*\)/);
      if (checkMatch && checkMatch[1]) {
        selector = checkMatch[1];
        data = `Check checkbox with selector: ${selector}`;
        expected = "Checkbox is checked successfully";
      }
    } else if (code.includes(".uncheck(")) {
      action = "Uncheck Checkbox";
      
      // Trích xuất selector từ uncheck
      const uncheckMatch = code.match(/\.uncheck\(\s*['"]([^'"]+)['"]\s*\)/);
      if (uncheckMatch && uncheckMatch[1]) {
        selector = uncheckMatch[1];
        data = `Uncheck checkbox with selector: ${selector}`;
        expected = "Checkbox is unchecked successfully";
      }
    } else if (code.includes(".selectOption(")) {
      action = "Select Option";
      
      // Trích xuất selector và value từ selectOption
      const selectMatch = code.match(/\.selectOption\(\s*['"]([^'"]+)['"]\s*\)/);
      if (selectMatch && selectMatch[1]) {
        data = selectMatch[1];
        expected = `Option "${data}" is selected successfully`;
      }
      
      // Trích xuất selector
      const selectorMatch = code.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/);
      if (selectorMatch && selectorMatch[1]) {
        selector = selectorMatch[1];
      }
    } else if (code.includes(".hover(")) {
      action = "Hover Element";
      
      // Trích xuất selector từ hover
      const hoverMatch = code.match(/\.hover\(\s*['"]([^'"]+)['"]\s*\)/);
      if (hoverMatch && hoverMatch[1]) {
        selector = hoverMatch[1];
        data = `Hover over element with selector: ${selector}`;
        expected = "Element is hovered successfully";
      }
    } else if (code.includes(".waitForSelector(") || code.includes(".waitForLoadState(")) {
      action = "Wait For Element";
      
      // Trích xuất selector từ waitForSelector
      const waitMatch = code.match(/\.waitForSelector\(\s*['"]([^'"]+)['"]\s*\)/);
      if (waitMatch && waitMatch[1]) {
        selector = waitMatch[1];
        data = `Wait for selector: ${selector}`;
        expected = "Element appears on the page";
      } else {
        data = "Wait for page to load";
        expected = "Page is loaded completely";
      }
    } else if (code.includes(".keyboard.")) {
      action = "Keyboard Action";
      data = code;
      expected = "Keyboard action completes successfully";
    } else if (code.includes(".screenshot(")) {
      action = "Take Screenshot";
      data = "Capture screenshot";
      expected = "Screenshot is taken successfully";
    }

    // Trả về cấu trúc step được phân tích
    return NextResponse.json({
      action,
      data,
      expected,
      selector,
      playwrightCode: code,
      success: true
    });
  } catch (error) {
    console.error("Error analyzing Playwright code:", error);
    return NextResponse.json(
      { error: "Failed to analyze code" },
      { status: 500 }
    );
  }
} 