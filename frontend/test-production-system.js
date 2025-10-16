#!/usr/bin/env node

/**
 * Comprehensive Production System Test Suite
 * Tests all functionality to ensure 100% operational system
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FRONTEND_URL = "http://localhost:12001";
const BACKEND_URL = "http://localhost:8000";

class ProductionTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.authToken = null;
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

  async testBackendHealth() {
    const response = await axios.get(`${BACKEND_URL}/health`);
    if (response.status !== 200) {
      throw new Error(`Backend health check failed: ${response.status}`);
    }
  }

  async testAuthentication() {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123"
    });
    
    if (!response.data.access_token) {
      throw new Error("No access token received");
    }
    
    this.authToken = response.data.access_token;
  }

  async testDocumentsList() {
    if (!this.authToken) {
      throw new Error("No auth token available");
    }

    const response = await axios.get(`${BACKEND_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.items || !Array.isArray(response.data.items)) {
      throw new Error("Documents list not returned as expected");
    }

    this.log(`Found ${response.data.items.length} documents in system`);
  }

  async testDocumentUpload() {
    if (!this.authToken) {
      throw new Error("No auth token available");
    }

    // Create a test file
    const testContent = `Test document uploaded at ${new Date().toISOString()}`;
    const testFilePath = "/tmp/test-upload.txt";
    fs.writeFileSync(testFilePath, testContent);

    const FormData = require("form-data");
    const formData = new FormData();
    formData.append("file", fs.createReadStream(testFilePath), "test-upload.txt");

    const response = await axios.post(`${BACKEND_URL}/api/documents/upload`, formData, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        ...formData.getHeaders()
      }
    });

    if (!response.data.id) {
      throw new Error("Document upload did not return document ID");
    }

    this.log(`Successfully uploaded document with ID: ${response.data.id}`);
    
    // Clean up
    fs.unlinkSync(testFilePath);
  }

  async testFrontendAPI() {
    if (!this.authToken) {
      throw new Error("No auth token available");
    }

    const response = await axios.get(`${FRONTEND_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.items || !Array.isArray(response.data.items)) {
      throw new Error("Frontend API not returning documents correctly");
    }
  }

  async testFrontendLogin() {
    const response = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123"
    });

    if (!response.data.access_token) {
      throw new Error("Frontend login API not working");
    }
  }

  async testUserAuthentication() {
    if (!this.authToken) {
      throw new Error("No auth token available");
    }

    const response = await axios.get(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!response.data.username) {
      throw new Error("User authentication verification failed");
    }

    this.log(`Authenticated as user: ${response.data.username}`);
  }

  async testDocumentDownload() {
    if (!this.authToken) {
      throw new Error("No auth token available");
    }

    // Get first document
    const docsResponse = await axios.get(`${BACKEND_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${this.authToken}` }
    });

    if (!docsResponse.data.items || docsResponse.data.items.length === 0) {
      throw new Error("No documents available for download test");
    }

    const firstDoc = docsResponse.data.items[0];
    const downloadResponse = await axios.get(`${BACKEND_URL}/api/documents/${firstDoc.id}/download`, {
      headers: { Authorization: `Bearer ${this.authToken}` },
      responseType: "stream"
    });

    if (downloadResponse.status !== 200) {
      throw new Error(`Document download failed: ${downloadResponse.status}`);
    }

    this.log(`Successfully downloaded document: ${firstDoc.original_filename}`);
  }

  async testSystemIntegration() {
    // Test that frontend can communicate with backend through its API layer
    const response = await axios.post(`${FRONTEND_URL}/api/auth/login`, {
      username: "admin",
      password: "admin123"
    });

    const token = response.data.access_token;
    
    const docsResponse = await axios.get(`${FRONTEND_URL}/api/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!docsResponse.data.items) {
      throw new Error("Frontend-Backend integration not working");
    }

    this.log("Frontend-Backend integration working correctly");
  }

  async runAllTests() {
    this.log("🚀 Starting Comprehensive Production System Tests", "info");
    this.log("============================================================", "info");

    await this.test("Backend Health Check", () => this.testBackendHealth());
    await this.test("Authentication System", () => this.testAuthentication());
    await this.test("User Authentication Verification", () => this.testUserAuthentication());
    await this.test("Documents List API", () => this.testDocumentsList());
    await this.test("Document Upload Functionality", () => this.testDocumentUpload());
    await this.test("Document Download Functionality", () => this.testDocumentDownload());
    await this.test("Frontend Login API", () => this.testFrontendLogin());
    await this.test("Frontend Documents API", () => this.testFrontendAPI());
    await this.test("System Integration Test", () => this.testSystemIntegration());

    this.log("============================================================", "info");
    this.log(`📊 TEST RESULTS SUMMARY`, "info");
    this.log(`✅ Passed: ${this.results.passed}`, "success");
    this.log(`❌ Failed: ${this.results.failed}`, this.results.failed > 0 ? "error" : "info");
    this.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`, "info");

    if (this.results.failed === 0) {
      this.log("🎉 ALL TESTS PASSED! System is 100% operational!", "success");
      return true;
    } else {
      this.log("⚠️  Some tests failed. System needs attention.", "error");
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
  const tester = new ProductionTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error("Test runner failed:", error);
    process.exit(1);
  });
}

module.exports = ProductionTester;