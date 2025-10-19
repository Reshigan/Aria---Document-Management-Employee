"""
Commercial Load Testing and Scalability Validation
Comprehensive performance testing, stress testing, and scalability analysis
"""

import asyncio
import aiohttp
import json
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
import concurrent.futures
import threading
import logging
import os
import random
import string

logger = logging.getLogger(__name__)

@dataclass
class LoadTestResult:
    test_name: str
    start_time: datetime
    end_time: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    errors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_name": self.test_name,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "duration_seconds": (self.end_time - self.start_time).total_seconds(),
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": (self.successful_requests / self.total_requests) * 100 if self.total_requests > 0 else 0,
            "avg_response_time": self.avg_response_time,
            "min_response_time": self.min_response_time,
            "max_response_time": self.max_response_time,
            "p95_response_time": self.p95_response_time,
            "p99_response_time": self.p99_response_time,
            "requests_per_second": self.requests_per_second,
            "errors": self.errors
        }

class LoadTestScenario:
    """Load test scenario configuration"""
    
    def __init__(self, name: str, url: str, method: str = "GET", 
                 headers: Dict[str, str] = None, data: Any = None,
                 weight: float = 1.0):
        self.name = name
        self.url = url
        self.method = method
        self.headers = headers or {}
        self.data = data
        self.weight = weight

class LoadTester:
    """Comprehensive load testing system"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.scenarios = []
        self.results = []
        self.auth_token = None
        
    def add_scenario(self, scenario: LoadTestScenario):
        """Add a load test scenario"""
        self.scenarios.append(scenario)
    
    async def authenticate(self, username: str, password: str) -> bool:
        """Authenticate and get token for protected endpoints"""
        try:
            async with aiohttp.ClientSession() as session:
                login_data = {"username": username, "password": password}
                async with session.post(
                    f"{self.base_url}/api/auth/login",
                    json=login_data
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.auth_token = data.get("access_token")
                        return True
                    return False
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False
    
    async def run_load_test(self, concurrent_users: int, duration_seconds: int, 
                          ramp_up_seconds: int = 0) -> LoadTestResult:
        """Run load test with specified parameters"""
        start_time = datetime.utcnow()
        
        # Prepare test data
        response_times = []
        successful_requests = 0
        failed_requests = 0
        errors = []
        
        # Create semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(concurrent_users)
        
        # Calculate request intervals for ramp-up
        if ramp_up_seconds > 0:
            ramp_up_interval = ramp_up_seconds / concurrent_users
        else:
            ramp_up_interval = 0
        
        async def make_request(session: aiohttp.ClientSession, scenario: LoadTestScenario) -> Dict[str, Any]:
            """Make a single request"""
            async with semaphore:
                request_start = time.time()
                try:
                    headers = scenario.headers.copy()
                    if self.auth_token:
                        headers["Authorization"] = f"Bearer {self.auth_token}"
                    
                    url = f"{self.base_url}{scenario.url}"
                    
                    async with session.request(
                        scenario.method,
                        url,
                        headers=headers,
                        json=scenario.data if scenario.method in ["POST", "PUT", "PATCH"] else None,
                        timeout=aiohttp.ClientTimeout(total=30)
                    ) as response:
                        response_time = time.time() - request_start
                        
                        return {
                            "success": response.status < 400,
                            "status_code": response.status,
                            "response_time": response_time,
                            "scenario": scenario.name,
                            "error": None
                        }
                        
                except Exception as e:
                    response_time = time.time() - request_start
                    return {
                        "success": False,
                        "status_code": 0,
                        "response_time": response_time,
                        "scenario": scenario.name,
                        "error": str(e)
                    }
        
        async def user_session():
            """Simulate a user session"""
            async with aiohttp.ClientSession() as session:
                session_start = time.time()
                
                while time.time() - session_start < duration_seconds:
                    # Select scenario based on weight
                    scenario = self._select_weighted_scenario()
                    
                    result = await make_request(session, scenario)
                    
                    response_times.append(result["response_time"])
                    
                    if result["success"]:
                        nonlocal successful_requests
                        successful_requests += 1
                    else:
                        nonlocal failed_requests
                        failed_requests += 1
                        if result["error"]:
                            errors.append(f"{scenario.name}: {result['error']}")
                    
                    # Small delay between requests to simulate real user behavior
                    await asyncio.sleep(random.uniform(0.1, 1.0))
        
        # Start user sessions with ramp-up
        tasks = []
        for i in range(concurrent_users):
            if ramp_up_interval > 0:
                await asyncio.sleep(ramp_up_interval)
            
            task = asyncio.create_task(user_session())
            tasks.append(task)
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = datetime.utcnow()
        
        # Calculate statistics
        total_requests = successful_requests + failed_requests
        duration = (end_time - start_time).total_seconds()
        
        if response_times:
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            p99_response_time = statistics.quantiles(response_times, n=100)[98]  # 99th percentile
        else:
            avg_response_time = min_response_time = max_response_time = 0
            p95_response_time = p99_response_time = 0
        
        requests_per_second = total_requests / duration if duration > 0 else 0
        
        result = LoadTestResult(
            test_name=f"Load Test - {concurrent_users} users",
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            avg_response_time=avg_response_time,
            min_response_time=min_response_time,
            max_response_time=max_response_time,
            p95_response_time=p95_response_time,
            p99_response_time=p99_response_time,
            requests_per_second=requests_per_second,
            errors=errors[:100]  # Keep only first 100 errors
        )
        
        self.results.append(result)
        return result
    
    def _select_weighted_scenario(self) -> LoadTestScenario:
        """Select scenario based on weight"""
        if not self.scenarios:
            raise ValueError("No scenarios configured")
        
        total_weight = sum(scenario.weight for scenario in self.scenarios)
        random_value = random.uniform(0, total_weight)
        
        current_weight = 0
        for scenario in self.scenarios:
            current_weight += scenario.weight
            if random_value <= current_weight:
                return scenario
        
        return self.scenarios[-1]  # Fallback
    
    async def run_stress_test(self, max_users: int, step_size: int = 10, 
                            step_duration: int = 60) -> List[LoadTestResult]:
        """Run stress test with increasing load"""
        stress_results = []
        
        for users in range(step_size, max_users + 1, step_size):
            logger.info(f"Running stress test with {users} concurrent users")
            
            result = await self.run_load_test(
                concurrent_users=users,
                duration_seconds=step_duration,
                ramp_up_seconds=10
            )
            
            stress_results.append(result)
            
            # Check if system is failing
            if result.failed_requests / result.total_requests > 0.1:  # 10% failure rate
                logger.warning(f"High failure rate at {users} users, stopping stress test")
                break
            
            # Brief pause between stress levels
            await asyncio.sleep(5)
        
        return stress_results
    
    async def run_spike_test(self, normal_users: int, spike_users: int, 
                           spike_duration: int = 60) -> Dict[str, LoadTestResult]:
        """Run spike test to check system behavior under sudden load"""
        results = {}
        
        # Baseline test
        logger.info(f"Running baseline test with {normal_users} users")
        baseline_result = await self.run_load_test(
            concurrent_users=normal_users,
            duration_seconds=120
        )
        results["baseline"] = baseline_result
        
        # Spike test
        logger.info(f"Running spike test with {spike_users} users")
        spike_result = await self.run_load_test(
            concurrent_users=spike_users,
            duration_seconds=spike_duration,
            ramp_up_seconds=5  # Quick ramp-up for spike
        )
        results["spike"] = spike_result
        
        # Recovery test
        logger.info(f"Running recovery test with {normal_users} users")
        recovery_result = await self.run_load_test(
            concurrent_users=normal_users,
            duration_seconds=120
        )
        results["recovery"] = recovery_result
        
        return results
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        if not self.results:
            return {"error": "No test results available"}
        
        report = {
            "summary": {
                "total_tests": len(self.results),
                "test_period": {
                    "start": min(result.start_time for result in self.results).isoformat(),
                    "end": max(result.end_time for result in self.results).isoformat()
                }
            },
            "results": [result.to_dict() for result in self.results],
            "analysis": self._analyze_results(),
            "recommendations": self._generate_recommendations()
        }
        
        return report
    
    def _analyze_results(self) -> Dict[str, Any]:
        """Analyze test results for patterns and insights"""
        if not self.results:
            return {}
        
        # Calculate overall statistics
        total_requests = sum(result.total_requests for result in self.results)
        total_successful = sum(result.successful_requests for result in self.results)
        total_failed = sum(result.failed_requests for result in self.results)
        
        avg_response_times = [result.avg_response_time for result in self.results]
        avg_rps = [result.requests_per_second for result in self.results]
        
        return {
            "overall_stats": {
                "total_requests": total_requests,
                "overall_success_rate": (total_successful / total_requests) * 100 if total_requests > 0 else 0,
                "avg_response_time": statistics.mean(avg_response_times),
                "max_response_time": max(result.max_response_time for result in self.results),
                "avg_requests_per_second": statistics.mean(avg_rps),
                "max_requests_per_second": max(avg_rps)
            },
            "performance_trends": {
                "response_time_trend": avg_response_times,
                "throughput_trend": avg_rps,
                "error_rate_trend": [(result.failed_requests / result.total_requests) * 100 for result in self.results]
            }
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance recommendations based on test results"""
        recommendations = []
        
        if not self.results:
            return recommendations
        
        # Analyze response times
        avg_response_time = statistics.mean([result.avg_response_time for result in self.results])
        if avg_response_time > 2.0:
            recommendations.append("Average response time is high (>2s). Consider optimizing database queries and adding caching.")
        
        # Analyze error rates
        avg_error_rate = statistics.mean([(result.failed_requests / result.total_requests) * 100 for result in self.results])
        if avg_error_rate > 5:
            recommendations.append("Error rate is high (>5%). Check application logs and fix failing endpoints.")
        
        # Analyze throughput
        max_rps = max([result.requests_per_second for result in self.results])
        if max_rps < 100:
            recommendations.append("Low throughput (<100 RPS). Consider scaling horizontally or optimizing application performance.")
        
        # Check for performance degradation under load
        if len(self.results) > 1:
            first_result = self.results[0]
            last_result = self.results[-1]
            
            if last_result.avg_response_time > first_result.avg_response_time * 2:
                recommendations.append("Significant performance degradation under load. Consider implementing connection pooling and optimizing resource usage.")
        
        return recommendations

class ScalabilityAnalyzer:
    """Analyze system scalability characteristics"""
    
    def __init__(self):
        self.test_results = []
    
    def add_test_result(self, result: LoadTestResult):
        """Add test result for analysis"""
        self.test_results.append(result)
    
    def analyze_scalability(self) -> Dict[str, Any]:
        """Analyze scalability patterns"""
        if len(self.test_results) < 2:
            return {"error": "Need at least 2 test results for scalability analysis"}
        
        # Sort results by requests per second (proxy for load)
        sorted_results = sorted(self.test_results, key=lambda x: x.requests_per_second)
        
        # Calculate scalability metrics
        throughput_efficiency = self._calculate_throughput_efficiency(sorted_results)
        response_time_degradation = self._calculate_response_time_degradation(sorted_results)
        error_rate_progression = self._calculate_error_rate_progression(sorted_results)
        
        # Determine bottlenecks
        bottlenecks = self._identify_bottlenecks(sorted_results)
        
        # Calculate scalability score
        scalability_score = self._calculate_scalability_score(
            throughput_efficiency, response_time_degradation, error_rate_progression
        )
        
        return {
            "scalability_score": scalability_score,
            "throughput_efficiency": throughput_efficiency,
            "response_time_degradation": response_time_degradation,
            "error_rate_progression": error_rate_progression,
            "bottlenecks": bottlenecks,
            "recommendations": self._generate_scalability_recommendations(scalability_score, bottlenecks)
        }
    
    def _calculate_throughput_efficiency(self, results: List[LoadTestResult]) -> float:
        """Calculate how efficiently throughput scales with load"""
        if len(results) < 2:
            return 0
        
        # Compare first and last results
        first_rps = results[0].requests_per_second
        last_rps = results[-1].requests_per_second
        
        # Ideal scaling would be linear
        expected_scaling = len(results)
        actual_scaling = last_rps / first_rps if first_rps > 0 else 0
        
        efficiency = min(100, (actual_scaling / expected_scaling) * 100)
        return efficiency
    
    def _calculate_response_time_degradation(self, results: List[LoadTestResult]) -> float:
        """Calculate response time degradation under load"""
        if len(results) < 2:
            return 0
        
        first_rt = results[0].avg_response_time
        last_rt = results[-1].avg_response_time
        
        degradation = ((last_rt - first_rt) / first_rt) * 100 if first_rt > 0 else 0
        return max(0, degradation)
    
    def _calculate_error_rate_progression(self, results: List[LoadTestResult]) -> List[float]:
        """Calculate error rate progression"""
        return [
            (result.failed_requests / result.total_requests) * 100 if result.total_requests > 0 else 0
            for result in results
        ]
    
    def _identify_bottlenecks(self, results: List[LoadTestResult]) -> List[str]:
        """Identify potential system bottlenecks"""
        bottlenecks = []
        
        # Check for CPU bottleneck (response time increases significantly)
        if len(results) >= 2:
            rt_increase = results[-1].avg_response_time / results[0].avg_response_time
            if rt_increase > 3:
                bottlenecks.append("CPU bottleneck - response times increase significantly under load")
        
        # Check for memory bottleneck (error rates increase)
        error_rates = self._calculate_error_rate_progression(results)
        if any(rate > 10 for rate in error_rates):
            bottlenecks.append("Memory bottleneck - high error rates under load")
        
        # Check for I/O bottleneck (throughput plateaus)
        if len(results) >= 3:
            rps_values = [result.requests_per_second for result in results[-3:]]
            if max(rps_values) - min(rps_values) < max(rps_values) * 0.1:
                bottlenecks.append("I/O bottleneck - throughput plateaus")
        
        return bottlenecks
    
    def _calculate_scalability_score(self, throughput_eff: float, rt_degradation: float, 
                                   error_rates: List[float]) -> float:
        """Calculate overall scalability score (0-100)"""
        # Throughput efficiency (40% weight)
        throughput_score = throughput_eff * 0.4
        
        # Response time score (30% weight) - lower degradation is better
        rt_score = max(0, 100 - rt_degradation) * 0.3
        
        # Error rate score (30% weight) - lower error rates are better
        max_error_rate = max(error_rates) if error_rates else 0
        error_score = max(0, 100 - max_error_rate * 10) * 0.3
        
        return throughput_score + rt_score + error_score
    
    def _generate_scalability_recommendations(self, score: float, bottlenecks: List[str]) -> List[str]:
        """Generate scalability recommendations"""
        recommendations = []
        
        if score < 50:
            recommendations.append("Poor scalability detected. Consider major architectural changes.")
        elif score < 70:
            recommendations.append("Moderate scalability. Optimization needed for production scale.")
        elif score < 85:
            recommendations.append("Good scalability. Minor optimizations recommended.")
        else:
            recommendations.append("Excellent scalability characteristics.")
        
        # Add specific recommendations based on bottlenecks
        for bottleneck in bottlenecks:
            if "CPU" in bottleneck:
                recommendations.append("Consider horizontal scaling or CPU optimization.")
            elif "Memory" in bottleneck:
                recommendations.append("Increase memory allocation or optimize memory usage.")
            elif "I/O" in bottleneck:
                recommendations.append("Optimize database queries and consider connection pooling.")
        
        return recommendations

# Pre-configured test scenarios
def create_default_scenarios() -> List[LoadTestScenario]:
    """Create default load test scenarios"""
    return [
        LoadTestScenario("Health Check", "/health", "GET", weight=1.0),
        LoadTestScenario("Login", "/api/auth/login", "POST", 
                        data={"username": "admin", "password": "admin123"}, weight=0.5),
        LoadTestScenario("Get Documents", "/api/documents", "GET", weight=2.0),
        LoadTestScenario("Get Reports", "/api/reports/document-status", "GET", weight=1.5),
        LoadTestScenario("AI Chat", "/api/ai/chat", "POST",
                        data={"message": "Hello, how are you?"}, weight=1.0),
        LoadTestScenario("System Settings", "/api/settings/system", "GET", weight=0.5)
    ]

# Main load testing function
async def run_comprehensive_load_test(base_url: str, max_users: int = 100) -> Dict[str, Any]:
    """Run comprehensive load testing suite"""
    logger.info("Starting comprehensive load testing suite")
    
    # Initialize load tester
    load_tester = LoadTester(base_url)
    
    # Add default scenarios
    for scenario in create_default_scenarios():
        load_tester.add_scenario(scenario)
    
    # Authenticate
    auth_success = await load_tester.authenticate("admin", "admin123")
    if not auth_success:
        logger.warning("Authentication failed, some tests may fail")
    
    # Run different types of tests
    test_results = {}
    
    try:
        # 1. Baseline load test
        logger.info("Running baseline load test")
        baseline_result = await load_tester.run_load_test(
            concurrent_users=10,
            duration_seconds=60
        )
        test_results["baseline"] = baseline_result.to_dict()
        
        # 2. Stress test
        logger.info("Running stress test")
        stress_results = await load_tester.run_stress_test(
            max_users=min(max_users, 50),  # Limit for safety
            step_size=10,
            step_duration=30
        )
        test_results["stress"] = [result.to_dict() for result in stress_results]
        
        # 3. Spike test
        logger.info("Running spike test")
        spike_results = await load_tester.run_spike_test(
            normal_users=10,
            spike_users=min(max_users, 30),
            spike_duration=30
        )
        test_results["spike"] = {k: v.to_dict() for k, v in spike_results.items()}
        
        # 4. Generate comprehensive report
        report = load_tester.generate_report()
        
        # 5. Scalability analysis
        analyzer = ScalabilityAnalyzer()
        for result in load_tester.results:
            analyzer.add_test_result(result)
        
        scalability_analysis = analyzer.analyze_scalability()
        
        return {
            "test_results": test_results,
            "comprehensive_report": report,
            "scalability_analysis": scalability_analysis,
            "timestamp": datetime.utcnow().isoformat(),
            "test_configuration": {
                "base_url": base_url,
                "max_users": max_users,
                "scenarios": len(load_tester.scenarios)
            }
        }
        
    except Exception as e:
        logger.error(f"Load testing failed: {e}")
        return {
            "error": str(e),
            "partial_results": test_results,
            "timestamp": datetime.utcnow().isoformat()
        }

# Utility function to run load tests from command line
if __name__ == "__main__":
    import sys
    
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:12000"
    max_users = int(sys.argv[2]) if len(sys.argv) > 2 else 50
    
    async def main():
        results = await run_comprehensive_load_test(base_url, max_users)
        print(json.dumps(results, indent=2))
    
    asyncio.run(main())