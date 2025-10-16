#!/usr/bin/env node

/**
 * Production Readiness Assessment
 * Comprehensive evaluation for customer-ready deployment
 */

const axios = require("axios");
const fs = require("fs");

const FRONTEND_URL = "http://localhost:3000";
const BACKEND_URL = "http://localhost:8000";
const LIVE_URL = "https://aria.vantax.co.za";

class ProductionReadinessAssessment {
  constructor() {
    this.results = {
      core_functionality: [],
      security: [],
      performance: [],
      reliability: [],
      user_experience: [],
      operational: [],
      compliance: []
    };
    this.overallScore = 0;
    this.criticalIssues = [];
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      critical: "🚨"
    };
    console.log(`[${timestamp}] ${emoji[level]} ${message}`);
  }

  async assessCoreFunctionality() {
    this.log("🔍 Assessing Core Functionality", "info");
    
    const tests = [
      {
        name: "User Authentication",
        test: async () => {
          const response = await axios.post(`${BACKEND_URL}/auth/login`, {
            username: "admin",
            password: "admin123"
          });
          return response.status === 200 && response.data.access_token;
        }
      },
      {
        name: "Document Management",
        test: async () => {
          const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
            username: "admin",
            password: "admin123"
          });
          const token = loginResponse.data.access_token;
          
          const docsResponse = await axios.get(`${BACKEND_URL}/documents/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return docsResponse.status === 200 && Array.isArray(docsResponse.data);
        }
      },
      {
        name: "File Upload/Download",
        test: async () => {
          const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
            username: "admin",
            password: "admin123"
          });
          const token = loginResponse.data.access_token;
          
          // Test upload
          const FormData = require('form-data');
          const form = new FormData();
          form.append('file', Buffer.from('test content'), 'test-readiness.txt');
          
          const uploadResponse = await axios.post(`${BACKEND_URL}/documents/upload`, form, {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${token}`
            }
          });
          
          if (uploadResponse.status !== 200) return false;
          
          // Test download
          const docId = uploadResponse.data.id;
          const downloadResponse = await axios.get(`${BACKEND_URL}/documents/${docId}/download`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          return downloadResponse.status === 200;
        }
      },
      {
        name: "Frontend-Backend Integration",
        test: async () => {
          const response = await axios.get(`${FRONTEND_URL}/api/auth/me`);
          return response.status === 401; // Expected for unauthenticated request
        }
      },
      {
        name: "Live Website Accessibility",
        test: async () => {
          const response = await axios.get(LIVE_URL, { timeout: 10000 });
          return response.status === 200 && response.data.includes('Aria');
        }
      }
    ];

    for (const test of tests) {
      try {
        const passed = await test.test();
        this.results.core_functionality.push({
          name: test.name,
          status: passed ? "PASS" : "FAIL",
          critical: true
        });
        if (passed) {
          this.log(`✅ ${test.name}: PASSED`, "success");
        } else {
          this.log(`❌ ${test.name}: FAILED`, "error");
          this.criticalIssues.push(`Core functionality failure: ${test.name}`);
        }
      } catch (error) {
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, "error");
        this.results.core_functionality.push({
          name: test.name,
          status: "ERROR",
          error: error.message,
          critical: true
        });
        this.criticalIssues.push(`Core functionality error: ${test.name} - ${error.message}`);
      }
    }
  }

  async assessSecurity() {
    this.log("🔒 Assessing Security", "info");
    
    const securityTests = [
      {
        name: "HTTPS Enforcement",
        test: async () => {
          try {
            const response = await axios.get(LIVE_URL, { timeout: 5000 });
            return response.request.protocol === 'https:';
          } catch (error) {
            return false;
          }
        },
        critical: true
      },
      {
        name: "Authentication Required",
        test: async () => {
          try {
            const response = await axios.get(`${BACKEND_URL}/documents/`);
            return response.status === 401;
          } catch (error) {
            return error.response && error.response.status === 401;
          }
        },
        critical: true
      },
      {
        name: "SQL Injection Protection",
        test: async () => {
          try {
            const maliciousPayload = "admin'; DROP TABLE users; --";
            const response = await axios.post(`${BACKEND_URL}/auth/login`, {
              username: maliciousPayload,
              password: "test"
            });
            return response.status === 401; // Should reject malicious input
          } catch (error) {
            return error.response && error.response.status === 401;
          }
        },
        critical: true
      },
      {
        name: "CORS Configuration",
        test: async () => {
          try {
            const response = await axios.options(`${BACKEND_URL}/auth/login`);
            return response.headers['access-control-allow-origin'] !== undefined;
          } catch (error) {
            return false;
          }
        },
        critical: false
      }
    ];

    for (const test of securityTests) {
      try {
        const passed = await test.test();
        this.results.security.push({
          name: test.name,
          status: passed ? "PASS" : "FAIL",
          critical: test.critical
        });
        if (passed) {
          this.log(`✅ ${test.name}: PASSED`, "success");
        } else {
          this.log(`${test.critical ? '🚨' : '⚠️'} ${test.name}: FAILED`, test.critical ? "critical" : "warning");
          if (test.critical) {
            this.criticalIssues.push(`Security vulnerability: ${test.name}`);
          }
        }
      } catch (error) {
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, "error");
        this.results.security.push({
          name: test.name,
          status: "ERROR",
          error: error.message,
          critical: test.critical
        });
      }
    }
  }

  async assessPerformance() {
    this.log("⚡ Assessing Performance", "info");
    
    const performanceTests = [
      {
        name: "Frontend Load Time",
        test: async () => {
          const start = Date.now();
          const response = await axios.get(LIVE_URL, { timeout: 10000 });
          const loadTime = Date.now() - start;
          this.log(`Frontend load time: ${loadTime}ms`, "info");
          return loadTime < 3000; // Should load in under 3 seconds
        }
      },
      {
        name: "API Response Time",
        test: async () => {
          const start = Date.now();
          try {
            await axios.get(`${BACKEND_URL}/health`);
          } catch (error) {
            // Health endpoint might not exist, try login endpoint
            try {
              await axios.post(`${BACKEND_URL}/auth/login`, {
                username: "invalid",
                password: "invalid"
              });
            } catch (e) {
              // Expected to fail, but should be fast
            }
          }
          const responseTime = Date.now() - start;
          this.log(`API response time: ${responseTime}ms`, "info");
          return responseTime < 1000; // Should respond in under 1 second
        }
      },
      {
        name: "Concurrent User Simulation",
        test: async () => {
          const promises = [];
          for (let i = 0; i < 5; i++) {
            promises.push(axios.get(LIVE_URL, { timeout: 10000 }));
          }
          const results = await Promise.allSettled(promises);
          const successful = results.filter(r => r.status === 'fulfilled').length;
          this.log(`Concurrent requests: ${successful}/5 successful`, "info");
          return successful >= 4; // At least 80% success rate
        }
      }
    ];

    for (const test of performanceTests) {
      try {
        const passed = await test.test();
        this.results.performance.push({
          name: test.name,
          status: passed ? "PASS" : "FAIL",
          critical: false
        });
        if (passed) {
          this.log(`✅ ${test.name}: PASSED`, "success");
        } else {
          this.log(`⚠️ ${test.name}: NEEDS OPTIMIZATION`, "warning");
        }
      } catch (error) {
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, "error");
        this.results.performance.push({
          name: test.name,
          status: "ERROR",
          error: error.message,
          critical: false
        });
      }
    }
  }

  async assessUserExperience() {
    this.log("👤 Assessing User Experience", "info");
    
    const uxTests = [
      {
        name: "Mobile Responsiveness",
        test: async () => {
          const response = await axios.get(LIVE_URL);
          return response.data.includes('viewport') && response.data.includes('responsive');
        }
      },
      {
        name: "Error Handling",
        test: async () => {
          try {
            await axios.get(`${LIVE_URL}/nonexistent-page`);
            return false;
          } catch (error) {
            return error.response && error.response.status === 404;
          }
        }
      },
      {
        name: "Loading States",
        test: async () => {
          const response = await axios.get(LIVE_URL);
          return response.data.includes('loading') || response.data.includes('spinner');
        }
      }
    ];

    for (const test of uxTests) {
      try {
        const passed = await test.test();
        this.results.user_experience.push({
          name: test.name,
          status: passed ? "PASS" : "FAIL",
          critical: false
        });
        if (passed) {
          this.log(`✅ ${test.name}: PASSED`, "success");
        } else {
          this.log(`⚠️ ${test.name}: COULD BE IMPROVED`, "warning");
        }
      } catch (error) {
        this.log(`❌ ${test.name}: ERROR - ${error.message}`, "error");
        this.results.user_experience.push({
          name: test.name,
          status: "ERROR",
          error: error.message,
          critical: false
        });
      }
    }
  }

  calculateOverallScore() {
    let totalTests = 0;
    let passedTests = 0;
    let criticalFailures = 0;

    Object.values(this.results).forEach(category => {
      category.forEach(test => {
        totalTests++;
        if (test.status === "PASS") {
          passedTests++;
        } else if (test.critical && test.status !== "PASS") {
          criticalFailures++;
        }
      });
    });

    this.overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    // Reduce score significantly for critical failures
    if (criticalFailures > 0) {
      this.overallScore = Math.max(0, this.overallScore - (criticalFailures * 20));
    }
  }

  generateReadinessReport() {
    this.log("📊 PRODUCTION READINESS ASSESSMENT REPORT", "info");
    this.log("============================================================", "info");
    
    this.calculateOverallScore();
    
    this.log(`🎯 Overall Readiness Score: ${this.overallScore}%`, "info");
    
    if (this.criticalIssues.length > 0) {
      this.log("🚨 CRITICAL ISSUES FOUND:", "critical");
      this.criticalIssues.forEach(issue => {
        this.log(`   • ${issue}`, "critical");
      });
    }

    // Readiness determination
    let readinessLevel = "";
    let recommendation = "";

    if (this.overallScore >= 95 && this.criticalIssues.length === 0) {
      readinessLevel = "🟢 READY FOR PRODUCTION";
      recommendation = "System is ready for customer deployment with minimal risk.";
    } else if (this.overallScore >= 85 && this.criticalIssues.length === 0) {
      readinessLevel = "🟡 MOSTLY READY";
      recommendation = "System is mostly ready but could benefit from performance optimizations.";
    } else if (this.overallScore >= 70 && this.criticalIssues.length <= 1) {
      readinessLevel = "🟠 NEEDS IMPROVEMENTS";
      recommendation = "System needs improvements before customer deployment.";
    } else {
      readinessLevel = "🔴 NOT READY";
      recommendation = "System has critical issues that must be resolved before customer deployment.";
    }

    this.log(`\n${readinessLevel}`, "info");
    this.log(`📋 Recommendation: ${recommendation}`, "info");

    // Category breakdown
    this.log("\n📈 CATEGORY BREAKDOWN:", "info");
    Object.entries(this.results).forEach(([category, tests]) => {
      const passed = tests.filter(t => t.status === "PASS").length;
      const total = tests.length;
      const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
      this.log(`   ${category.replace(/_/g, ' ').toUpperCase()}: ${passed}/${total} (${percentage}%)`, "info");
    });

    return {
      readinessLevel,
      overallScore: this.overallScore,
      criticalIssues: this.criticalIssues,
      recommendation,
      results: this.results
    };
  }

  async runFullAssessment() {
    this.log("🚀 Starting Production Readiness Assessment", "info");
    this.log("============================================================", "info");

    await this.assessCoreFunctionality();
    await this.assessSecurity();
    await this.assessPerformance();
    await this.assessUserExperience();

    return this.generateReadinessReport();
  }
}

// Run the assessment
async function main() {
  const assessment = new ProductionReadinessAssessment();
  try {
    const report = await assessment.runFullAssessment();
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      ...report
    };
    
    fs.writeFileSync('production-readiness-report.json', JSON.stringify(reportData, null, 2));
    assessment.log("📄 Report saved to production-readiness-report.json", "info");
    
    process.exit(report.criticalIssues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error("Assessment failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionReadinessAssessment;