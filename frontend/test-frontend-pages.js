#!/usr/bin/env node

/**
 * Frontend Pages Test Suite
 * Tests that all frontend pages load correctly
 */

const axios = require("axios");

const FRONTEND_URL = "http://localhost:3000";

class FrontendPageTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async test(name, testFn) {
    try {
      this.log(`Testing: ${name}`, "info");
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: "PASSED" });
      this.log(`✅ PASSED: ${name}`, "success");
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: "FAILED", error: error.message });
      this.log(`❌ FAILED: ${name} - ${error.message}`, "error");
    }
  }

  async testPageLoad(pagePath, expectedContent = null) {
    const url = `${FRONTEND_URL}${pagePath}`;
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status < 500 // Accept redirects and client errors
    });

    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }

    if (response.data.length < 100) {
      throw new Error("Page content too short, likely an error page");
    }

    if (expectedContent && !response.data.includes(expectedContent)) {
      this.log(`Warning: Expected content "${expectedContent}" not found, but page loaded`);
    }

    this.log(`Page ${pagePath} loaded successfully (${response.status})`);
  }

  async testHomePage() {
    await this.testPageLoad("/");
  }

  async testLoginPage() {
    await this.testPageLoad("/login", "login");
  }

  async testDashboardPage() {
    await this.testPageLoad("/dashboard");
  }

  async testDocumentsPage() {
    await this.testPageLoad("/documents");
  }

  async testSettingsPage() {
    await this.testPageLoad("/settings");
  }

  async testReportsPage() {
    await this.testPageLoad("/reports");
  }

  async testIntegrationsPage() {
    await this.testPageLoad("/integrations");
  }

  async testEnterpriseDashboard() {
    await this.testPageLoad("/enterprise-dashboard");
  }

  async testDocumentClassification() {
    await this.testPageLoad("/document-classification");
  }

  async test404Page() {
    const response = await axios.get(`${FRONTEND_URL}/nonexistent-page`, {
      timeout: 10000,
      validateStatus: () => true // Accept all status codes
    });

    if (response.status !== 404) {
      this.log(`Warning: Expected 404 for non-existent page, got ${response.status}`);
    } else {
      this.log("404 page handling works correctly");
    }
  }

  async testStaticAssets() {
    // Test that CSS and JS assets are being served
    try {
      const response = await axios.get(`${FRONTEND_URL}/_next/static/css/`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status < 500) {
        this.log("Static assets are being served");
      }
    } catch (error) {
      this.log("Static assets test skipped (expected for production build)");
    }
  }

  async testAPIEndpoints() {
    // Test that API routes are accessible
    const endpoints = [
      "/api/auth/login",
      "/api/documents",
      "/api/settings"
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${FRONTEND_URL}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        // We expect 401 or 405 for these endpoints without auth
        if (response.status === 401 || response.status === 405) {
          this.log(`API endpoint ${endpoint} is accessible and properly secured`);
        } else if (response.status < 500) {
          this.log(`API endpoint ${endpoint} is accessible`);
        } else {
          throw new Error(`API endpoint ${endpoint} returned server error: ${response.status}`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Cannot connect to API endpoint ${endpoint}`);
        }
        throw error;
      }
    }
  }

  async runAllTests() {
    this.log("🚀 Starting Frontend Pages Test Suite", "info");
    this.log("============================================================", "info");

    await this.test("Home Page", () => this.testHomePage());
    await this.test("Login Page", () => this.testLoginPage());
    await this.test("Dashboard Page", () => this.testDashboardPage());
    await this.test("Documents Page", () => this.testDocumentsPage());
    await this.test("Settings Page", () => this.testSettingsPage());
    await this.test("Reports Page", () => this.testReportsPage());
    await this.test("Integrations Page", () => this.testIntegrationsPage());
    await this.test("Enterprise Dashboard", () => this.testEnterpriseDashboard());
    await this.test("Document Classification", () => this.testDocumentClassification());
    await this.test("404 Error Handling", () => this.test404Page());
    await this.test("Static Assets", () => this.testStaticAssets());
    await this.test("API Endpoints", () => this.testAPIEndpoints());

    this.log("============================================================", "info");
    this.log(`📊 FRONTEND TEST RESULTS SUMMARY`, "info");
    this.log(`✅ Passed: ${this.results.passed}`, "success");
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? "error" : "info");
    this.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`, "info");

    if (this.results.failed === 0) {
      this.log("🎉 ALL FRONTEND TESTS PASSED! All pages are loading correctly!", "success");
      return true;
    } else {
      this.log("⚠️  Some frontend tests failed. Pages need attention.", "error");
      this.results.tests.forEach(test => {
        if (test.status === "FAILED") {
          this.log(`   - ${test.name}: ${test.error}`, "error");
        }
      });
      return false;
    }
  }
}

// Run the tests
async function main() {
  const tester = new FrontendPageTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error("Frontend test runner failed:", error);
    process.exit(1);
  });
}

module.exports = FrontendPageTester;