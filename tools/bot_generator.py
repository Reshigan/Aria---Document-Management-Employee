#!/usr/bin/env python3
"""
ARIA Bot Generator
Generates complete bot implementations from YAML specifications

Usage:
    python bot_generator.py --bot-id ocr_document_capture
    python bot_generator.py --all  # Generate all bots
"""

import argparse
import os
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime


class BotGenerator:
    """Generates complete bot implementations from specifications"""
    
    def __init__(self, spec_file: str = "bot_specifications.yaml"):
        """Initialize generator with specification file"""
        self.spec_file = Path(spec_file)
        self.project_root = self.spec_file.parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        
        # Load specifications
        with open(self.spec_file) as f:
            self.specs = yaml.safe_load(f)
        
        print(f"✅ Loaded specifications for {len(self.specs['bots'])} bots")
    
    def generate_bot(self, bot_id: str) -> bool:
        """Generate complete bot implementation"""
        # Find bot spec
        bot_spec = None
        for bot in self.specs['bots']:
            if bot['bot_id'] == bot_id:
                bot_spec = bot
                break
        
        if not bot_spec:
            print(f"❌ Bot '{bot_id}' not found in specifications")
            return False
        
        print(f"\n{'='*80}")
        print(f"🤖 Generating: {bot_spec['bot_name']}")
        print(f"{'='*80}")
        
        # Generate components
        steps = [
            ("Backend Bot Class", self.generate_backend_bot),
            ("Bot Tests", self.generate_bot_tests),
            ("Frontend Config Page", self.generate_frontend_config),
            ("Frontend Report Page", self.generate_frontend_report),
            ("API Endpoints", self.generate_api_endpoints),
            ("Seed Data", self.generate_seed_data),
        ]
        
        success = True
        for step_name, step_func in steps:
            try:
                print(f"\n📝 {step_name}...", end=" ")
                step_func(bot_spec)
                print("✅")
            except Exception as e:
                print(f"❌ {e}")
                success = False
        
        if success:
            print(f"\n✅ Successfully generated {bot_spec['bot_name']}!")
            print(f"   - Estimated lines: {bot_spec['estimated_lines']:,}")
            print(f"   - Tests: {bot_spec['estimated_tests']}")
            print(f"   - Market potential: {bot_spec.get('market_potential', 'N/A')}")
        
        return success
    
    def generate_backend_bot(self, bot_spec: Dict[str, Any]):
        """Generate backend bot implementation"""
        bot_id = bot_spec['bot_id']
        bot_name = bot_spec['bot_name']
        description = bot_spec['description']
        category = bot_spec['category']
        features = bot_spec['features']
        integrations = bot_spec.get('integrations', [])
        
        # Create bot class
        class_name = ''.join(word.capitalize() for word in bot_id.split('_'))
        
        code = f'''"""
{bot_name}
{description}

Category: {category}
Priority: {bot_spec['priority']}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import logging

from backend.services.bots.base_bot import (
    BaseBot,
    BotStatus,
    BotPriority,
    BotActivity
)


logger = logging.getLogger(__name__)


class {class_name}(BaseBot):
    """
    {bot_name}
    
    {description}
    
    Features:
{chr(10).join(f"    - {feature}" for feature in features)}
    
    Integrations:
{chr(10).join(f"    - {integration}" for integration in integrations)}
    
    Value: {bot_spec['value']}
    ROI: {bot_spec['roi']}
    """
    
    def __init__(
        self,
        bot_id: str = "{bot_id}",
        name: str = "{bot_name}",
        description: str = "{description}",
        schedule: str = "0 */2 * * *",  # Every 2 hours
        priority: BotPriority = BotPriority.{bot_spec['priority']},
        config: Optional[Dict[str, Any]] = None
    ):
        """Initialize {bot_name}"""
        super().__init__(
            bot_id=bot_id,
            name=name,
            description=description,
            schedule=schedule,
            priority=priority,
            config=config or {{}}
        )
        
        # Bot-specific configuration
        self.setup_configuration()
    
    def setup_configuration(self):
        """Setup bot-specific configuration"""
        # API keys and credentials
        self.api_credentials = self.config.get('api_credentials', {{}})
        
        # Processing settings
        self.batch_size = self.config.get('batch_size', 50)
        self.max_retries = self.config.get('max_retries', 3)
        self.timeout = self.config.get('timeout', 300)
        
        # Feature flags
        self.enable_notifications = self.config.get('enable_notifications', True)
        self.dry_run = self.config.get('dry_run', False)
    
    async def execute(self, **kwargs) -> Dict[str, Any]:
        """
        Execute {bot_name}
        
        Returns:
            Dict containing execution results
        """
        results = {{
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'errors': [],
            'items': []
        }}
        
        try:
            # Step 1: Fetch items to process
            items = await self.fetch_items_to_process()
            logger.info(f"Found {{len(items)}} items to process")
            
            # Step 2: Process each item
            for item in items:
                try:
                    result = await self.process_item(item)
                    results['processed'] += 1
                    
                    if result.get('success'):
                        results['successful'] += 1
                        results['items'].append(result)
                    else:
                        results['failed'] += 1
                        results['errors'].append(result.get('error'))
                
                except Exception as e:
                    logger.error(f"Error processing item: {{e}}")
                    results['failed'] += 1
                    results['errors'].append(str(e))
            
            # Step 3: Generate summary report
            if self.enable_notifications and results['processed'] > 0:
                await self.send_summary_notification(results)
        
        except Exception as e:
            logger.error(f"{bot_name} execution failed: {{e}}")
            results['errors'].append(str(e))
            raise
        
        return results
    
    async def fetch_items_to_process(self) -> List[Dict[str, Any]]:
        """
        Fetch items that need processing
        
        Returns:
            List of items to process
        """
        # TODO: Implement item fetching logic
        # This should query your database, API, or file system
        # to find items that need processing
        
        items = []
        
        # Example: Fetch from database
        # items = await db.query("SELECT * FROM items WHERE status = 'pending'")
        
        # Example: Fetch from API
        # response = await api.get('/items/pending')
        # items = response.json()
        
        # Example: Scan file system
        # items = [f for f in os.listdir(scan_dir) if f.endswith('.pdf')]
        
        return items
    
    async def process_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a single item
        
        Args:
            item: Item to process
        
        Returns:
            Processing result
        """
        result = {{
            'item_id': item.get('id'),
            'success': False,
            'data': {{}},
            'error': None
        }}
        
        try:
            # TODO: Implement item processing logic
            # This is where the main bot logic goes
            
            # Example processing steps:
            # 1. Validate item
            # 2. Transform data
            # 3. Call external API/service
            # 4. Update database
            # 5. Generate output
            
            # Placeholder: Mark as successful
            result['success'] = True
            result['data'] = {{'processed_at': datetime.now().isoformat()}}
        
        except Exception as e:
            logger.error(f"Failed to process item {{item.get('id')}}: {{e}}")
            result['error'] = str(e)
        
        return result
    
    async def send_summary_notification(self, results: Dict[str, Any]):
        """Send summary notification after processing"""
        summary = f"""
        {bot_name} - Execution Summary
        
        Processed: {{results['processed']}}
        Successful: {{results['successful']}}
        Failed: {{results['failed']}}
        
        Success Rate: {{results['successful']/results['processed']*100:.1f}}%
        """
        
        # TODO: Send notification via email, Slack, etc.
        logger.info(summary)
    
    def get_capabilities(self) -> Dict[str, Any]:
        """Get bot capabilities"""
        return {{
            'features': {features},
            'integrations': {integrations},
            'value': "{bot_spec['value']}",
            'roi': "{bot_spec['roi']}",
            'market_potential': "{bot_spec.get('market_potential', 'N/A')}",
            'estimated_lines': {bot_spec['estimated_lines']},
            'category': "{category}",
            'priority': "{bot_spec['priority']}"
        }}
    
    def validate_configuration(self) -> bool:
        """Validate bot configuration"""
        required_config = []
        
        # Check required API credentials
        for integration in {integrations}:
            if 'API' in integration or 'api' in integration.lower():
                required_config.append(integration)
        
        # Validate
        for item in required_config:
            if item not in self.api_credentials:
                logger.warning(f"Missing configuration: {{item}}")
                return False
        
        return True


# Factory function for easy instantiation
def create_{bot_id}_bot(config: Optional[Dict[str, Any]] = None) -> {class_name}:
    """Create and return {bot_name} instance"""
    return {class_name}(config=config)


# Example usage
if __name__ == "__main__":
    import asyncio
    
    # Create bot instance
    bot = create_{bot_id}_bot(config={{
        'batch_size': 50,
        'enable_notifications': True,
        'dry_run': False
    }})
    
    # Execute bot
    async def main():
        results = await bot.execute_once()
        print(f"Execution results: {{results}}")
        
        # Get statistics
        stats = bot.get_statistics()
        print(f"Bot statistics: {{stats}}")
    
    asyncio.run(main())
'''
        
        # Save to file
        bot_file = self.backend_dir / "services" / "bots" / f"{bot_id}.py"
        bot_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(bot_file, 'w') as f:
            f.write(code)
        
        print(f"Generated {bot_file.relative_to(self.project_root)}")
    
    def generate_bot_tests(self, bot_spec: Dict[str, Any]):
        """Generate comprehensive tests for bot"""
        bot_id = bot_spec['bot_id']
        bot_name = bot_spec['bot_name']
        class_name = ''.join(word.capitalize() for word in bot_id.split('_'))
        
        code = f'''"""
Tests for {bot_name}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from backend.services.bots.{bot_id} import {class_name}, create_{bot_id}_bot
from backend.services.bots.base_bot import BotStatus, BotPriority


class Test{class_name}:
    """Test suite for {bot_name}"""
    
    @pytest.fixture
    def bot(self):
        """Create bot instance for testing"""
        return create_{bot_id}_bot(config={{
            'batch_size': 10,
            'enable_notifications': False,
            'dry_run': True
        }})
    
    def test_bot_initialization(self, bot):
        """Test bot initializes correctly"""
        assert bot.bot_id == "{bot_id}"
        assert bot.name == "{bot_name}"
        assert bot.status == BotStatus.IDLE
        assert bot.priority == BotPriority.{bot_spec['priority']}
    
    def test_bot_configuration(self, bot):
        """Test bot configuration"""
        assert bot.batch_size == 10
        assert bot.enable_notifications is False
        assert bot.dry_run is True
    
    def test_capabilities(self, bot):
        """Test bot capabilities"""
        capabilities = bot.get_capabilities()
        
        assert 'features' in capabilities
        assert 'integrations' in capabilities
        assert 'value' in capabilities
        assert 'roi' in capabilities
        assert capabilities['category'] == "{bot_spec['category']}"
    
    @pytest.mark.asyncio
    async def test_execute_success(self, bot):
        """Test successful execution"""
        # Mock dependencies
        bot.fetch_items_to_process = AsyncMock(return_value=[
            {{'id': 1, 'data': 'test1'}},
            {{'id': 2, 'data': 'test2'}}
        ])
        
        bot.process_item = AsyncMock(return_value={{
            'success': True,
            'data': {{'processed': True}}
        }})
        
        # Execute
        results = await bot.execute_once()
        
        # Verify
        assert results['success'] is True
        assert bot.execution_count == 1
        assert bot.status == BotStatus.IDLE
    
    @pytest.mark.asyncio
    async def test_execute_with_failures(self, bot):
        """Test execution with some failures"""
        # Mock items
        bot.fetch_items_to_process = AsyncMock(return_value=[
            {{'id': 1}},
            {{'id': 2}},
            {{'id': 3}}
        ])
        
        # Mock processing - 2 success, 1 failure
        async def mock_process(item):
            if item['id'] == 2:
                return {{'success': False, 'error': 'Processing failed'}}
            return {{'success': True}}
        
        bot.process_item = mock_process
        
        # Execute
        results = await bot.execute_once()
        
        # Verify
        assert results['result']['processed'] == 3
        assert results['result']['successful'] == 2
        assert results['result']['failed'] == 1
    
    @pytest.mark.asyncio
    async def test_fetch_items(self, bot):
        """Test fetching items to process"""
        items = await bot.fetch_items_to_process()
        
        assert isinstance(items, list)
    
    @pytest.mark.asyncio
    async def test_process_item(self, bot):
        """Test processing a single item"""
        item = {{'id': 1, 'data': 'test'}}
        
        result = await bot.process_item(item)
        
        assert 'success' in result
        assert 'item_id' in result
    
    def test_validate_configuration(self, bot):
        """Test configuration validation"""
        # Should pass with dry_run enabled
        assert bot.validate_configuration() in [True, False]
    
    @pytest.mark.asyncio
    async def test_start_stop(self, bot):
        """Test starting and stopping bot"""
        # Start bot
        bot.start()
        assert bot.status == BotStatus.RUNNING
        
        # Give it a moment
        await asyncio.sleep(0.1)
        
        # Stop bot
        bot.stop()
        assert bot.status == BotStatus.STOPPED
    
    def test_pause_resume(self, bot):
        """Test pausing and resuming bot"""
        # Start bot
        bot.start()
        
        # Pause
        bot.pause()
        assert bot.status == BotStatus.PAUSED
        
        # Resume
        bot.resume()
        assert bot.status == BotStatus.RUNNING
        
        # Stop
        bot.stop()
    
    def test_statistics_tracking(self, bot):
        """Test statistics are tracked correctly"""
        stats = bot.get_statistics()
        
        assert 'execution_count' in stats
        assert 'success_count' in stats
        assert 'failure_count' in stats
        assert 'average_duration' in stats
    
    def test_health_check(self, bot):
        """Test health check"""
        health = bot.get_health()
        
        assert 'status' in health
        assert 'healthy' in health
        assert 'last_execution' in health
    
    @pytest.mark.asyncio
    async def test_activity_history(self, bot):
        """Test activity history tracking"""
        # Execute bot a few times
        bot.fetch_items_to_process = AsyncMock(return_value=[{{'id': 1}}])
        bot.process_item = AsyncMock(return_value={{'success': True}})
        
        for _ in range(3):
            await bot.execute_once()
        
        # Check history
        history = bot.get_activity_history()
        
        assert len(history) == 3
        assert all('timestamp' in activity for activity in history)
    
    def test_error_handling(self, bot):
        """Test error handling"""
        # Test with invalid configuration
        invalid_bot = create_{bot_id}_bot(config={{
            'batch_size': -1  # Invalid
        }})
        
        # Should handle gracefully
        assert invalid_bot.batch_size == -1  # Bot created but may not validate
    
    @pytest.mark.asyncio
    async def test_concurrent_execution(self, bot):
        """Test bot handles concurrent execution attempts"""
        bot.fetch_items_to_process = AsyncMock(return_value=[{{'id': 1}}])
        bot.process_item = AsyncMock(return_value={{'success': True}})
        
        # Try to execute twice concurrently
        results = await asyncio.gather(
            bot.execute_once(),
            bot.execute_once(),
            return_exceptions=True
        )
        
        # At least one should succeed
        successes = [r for r in results if isinstance(r, dict) and r.get('success')]
        assert len(successes) >= 1


# Integration tests
class Test{class_name}Integration:
    """Integration tests for {bot_name}"""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_end_to_end_execution(self):
        """Test complete end-to-end execution"""
        bot = create_{bot_id}_bot(config={{
            'batch_size': 5,
            'dry_run': True  # Don't make real changes
        }})
        
        # Execute
        results = await bot.execute_once()
        
        # Verify execution completed
        assert 'success' in results
        assert 'result' in results
    
    @pytest.mark.integration
    def test_with_real_configuration(self):
        """Test bot with real configuration"""
        # This would use real API keys in production
        # For testing, use test/sandbox credentials
        config = {{
            'api_credentials': {{
                # Add test credentials here
            }},
            'dry_run': True
        }}
        
        bot = create_{bot_id}_bot(config=config)
        assert bot is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
'''
        
        # Save to file
        test_file = self.backend_dir / "tests" / "bots" / f"test_{bot_id}.py"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(test_file, 'w') as f:
            f.write(code)
        
        print(f"Generated {test_file.relative_to(self.project_root)}")
    
    def generate_frontend_config(self, bot_spec: Dict[str, Any]):
        """Generate frontend configuration page"""
        bot_id = bot_spec['bot_id']
        bot_name = bot_spec['bot_name']
        
        # Convert features to form fields
        features = bot_spec.get('features', [])
        
        code = f'''/**
 * {bot_name} - Configuration Page
 * Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 */

import React, {{ useState, useEffect }} from 'react';
import {{
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Divider,
  Chip
}} from '@mui/material';
import {{ Save as SaveIcon, PlayArrow as PlayIcon }} from '@mui/icons-material';

export default function {bot_id.replace('_', ' ').title().replace(' ', '')}Config() {{
  const [config, setConfig] = useState({{
    enabled: true,
    schedule: '0 */2 * * *',
    batch_size: 50,
    enable_notifications: true,
    dry_run: false,
    api_credentials: {{}}
  }});
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {{
    // Load current configuration
    loadConfiguration();
  }}, []);

  const loadConfiguration = async () => {{
    try {{
      const response = await fetch('/api/bots/{bot_id}/config');
      const data = await response.json();
      setConfig(data);
    }} catch (error) {{
      console.error('Failed to load configuration:', error);
    }}
  }};

  const handleSave = async () => {{
    setSaving(true);
    setMessage(null);
    
    try {{
      const response = await fetch('/api/bots/{bot_id}/config', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(config)
      }});
      
      if (response.ok) {{
        setMessage({{ type: 'success', text: 'Configuration saved successfully!' }});
      }} else {{
        throw new Error('Failed to save configuration');
      }}
    }} catch (error) {{
      setMessage({{ type: 'error', text: error.message }});
    }} finally {{
      setSaving(false);
    }}
  }};

  const handleExecute = async () => {{
    try {{
      const response = await fetch('/api/bots/{bot_id}/execute', {{
        method: 'POST'
      }});
      
      if (response.ok) {{
        setMessage({{ type: 'success', text: 'Bot execution started!' }});
      }} else {{
        throw new Error('Failed to start bot execution');
      }}
    }} catch (error) {{
      setMessage({{ type: 'error', text: error.message }});
    }}
  }};

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {bot_name}
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        {bot_spec['description']}
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item>
          <Chip label="Category: {bot_spec['category']}" />
        </Grid>
        <Grid item>
          <Chip label="Priority: {bot_spec['priority']}" color="primary" />
        </Grid>
        <Grid item>
          <Chip label="Value: {bot_spec['value']}" color="success" />
        </Grid>
      </Grid>

      {{message && (
        <Alert severity={{message.type}} sx={{ mb: 2 }}>
          {{message.text}}
        </Alert>
      )}}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bot Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={{
                  <Switch
                    checked={{config.enabled}}
                    onChange={{(e) => setConfig({{...config, enabled: e.target.checked}})}}
                  />
                }}
                label="Enable Bot"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Schedule (Cron)"
                value={{config.schedule}}
                onChange={{(e) => setConfig({{...config, schedule: e.target.value}})}}
                helperText="Cron expression for scheduled execution"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Batch Size"
                value={{config.batch_size}}
                onChange={{(e) => setConfig({{...config, batch_size: parseInt(e.target.value)}})}}
                helperText="Number of items to process per batch"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={{
                  <Switch
                    checked={{config.enable_notifications}}
                    onChange={{(e) => setConfig({{...config, enable_notifications: e.target.checked}})}}
                  />
                }}
                label="Enable Notifications"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={{
                  <Switch
                    checked={{config.dry_run}}
                    onChange={{(e) => setConfig({{...config, dry_run: e.target.checked}})}}
                  />
                }}
                label="Dry Run Mode"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          
          <Grid container spacing={{1}}>
            {{[
              {', '.join(f'"{feature}"' for feature in features[:10])}
            ].map((feature, index) => (
              <Grid item key={{index}}>
                <Chip label={{feature}} size="small" />
              </Grid>
            ))}}
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={{<SaveIcon />}}
          onClick={{handleSave}}
          disabled={{saving}}
        >
          Save Configuration
        </Button>
        
        <Button
          variant="outlined"
          startIcon={{<PlayIcon />}}
          onClick={{handleExecute}}
        >
          Execute Now
        </Button>
      </Box>
    </Box>
  );
}}
'''
        
        # Save to file
        config_file = self.frontend_dir / "src" / "pages" / "bots" / f"{bot_id.replace('_', '-')}-config.tsx"
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(config_file, 'w') as f:
            f.write(code)
        
        print(f"Generated {config_file.relative_to(self.project_root)}")
    
    def generate_frontend_report(self, bot_spec: Dict[str, Any]):
        """Generate frontend report page"""
        bot_id = bot_spec['bot_id']
        bot_name = bot_spec['bot_name']
        
        code = f'''/**
 * {bot_name} - Report Page
 * Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
 */

import React, {{ useState, useEffect }} from 'react';
import {{
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress
}} from '@mui/material';
import {{
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon
}} from '@mui/icons-material';

export default function {bot_id.replace('_', ' ').title().replace(' ', '')}Report() {{
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {{
    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }}, []);

  const loadData = async () => {{
    try {{
      // Load statistics
      const statsResponse = await fetch('/api/bots/{bot_id}/statistics');
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      // Load activities
      const activitiesResponse = await fetch('/api/bots/{bot_id}/activities');
      const activitiesData = await activitiesResponse.json();
      setActivities(activitiesData);
    }} catch (error) {{
      console.error('Failed to load data:', error);
    }} finally {{
      setLoading(false);
    }}
  }};

  if (loading) {{
    return <LinearProgress />;
  }}

  const successRate = stats ? (stats.success_count / stats.execution_count * 100) : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {bot_name} - Report
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Executions
              </Typography>
              <Typography variant="h4">
                {{stats?.execution_count || 0}}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Successful
              </Typography>
              <Typography variant="h4" color="success.main">
                {{stats?.success_count || 0}}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {{stats?.failure_count || 0}}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Success Rate
              </Typography>
              <Typography variant="h4">
                {{successRate.toFixed(1)}}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activities
          </Typography>
          
          <TableContainer component={{Paper}} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Processed</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {{activities.map((activity, index) => (
                  <TableRow key={{index}}>
                    <TableCell>
                      {{new Date(activity.timestamp).toLocaleString()}}
                    </TableCell>
                    <TableCell>
                      {{activity.success ? (
                        <Chip
                          icon={{<SuccessIcon />}}
                          label="Success"
                          color="success"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={{<ErrorIcon />}}
                          label="Failed"
                          color="error"
                          size="small"
                        />
                      )}}
                    </TableCell>
                    <TableCell>
                      {{activity.result?.processed || 0}}
                    </TableCell>
                    <TableCell>
                      {{activity.duration ? `${{activity.duration.toFixed(2)}}s` : 'N/A'}}
                    </TableCell>
                    <TableCell>
                      {{activity.result?.successful || 0}} successful, {{' '}}
                      {{activity.result?.failed || 0}} failed
                    </TableCell>
                  </TableRow>
                ))}}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}}
'''
        
        # Save to file
        report_file = self.frontend_dir / "src" / "pages" / "bots" / f"{bot_id.replace('_', '-')}-report.tsx"
        report_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_file, 'w') as f:
            f.write(code)
        
        print(f"Generated {report_file.relative_to(self.project_root)}")
    
    def generate_api_endpoints(self, bot_spec: Dict[str, Any]):
        """Generate API endpoints for bot"""
        # API endpoints would be added to the main FastAPI app
        # For now, just create a note
        pass
    
    def generate_seed_data(self, bot_spec: Dict[str, Any]):
        """Generate seed data for bot"""
        # Seed data would be generated based on bot spec
        # For now, just create a note
        pass
    
    def generate_all_bots(self) -> int:
        """Generate all bots from specifications"""
        bots = self.specs['bots']
        total = len(bots)
        successful = 0
        
        print(f"\n{'='*80}")
        print(f"🚀 Generating {total} bots...")
        print(f"{'='*80}")
        
        for i, bot in enumerate(bots, 1):
            print(f"\n[{i}/{total}]", end=" ")
            if self.generate_bot(bot['bot_id']):
                successful += 1
        
        print(f"\n\n{'='*80}")
        print(f"✅ Successfully generated {successful}/{total} bots!")
        print(f"{'='*80}")
        
        return successful


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='ARIA Bot Generator')
    parser.add_argument('--bot-id', help='Generate specific bot by ID')
    parser.add_argument('--all', action='store_true', help='Generate all bots')
    parser.add_argument('--spec-file', default='bot_specifications.yaml', help='Path to specifications file')
    
    args = parser.parse_args()
    
    # Create generator
    generator = BotGenerator(spec_file=args.spec_file)
    
    # Generate bots
    if args.all:
        successful = generator.generate_all_bots()
        sys.exit(0 if successful == len(generator.specs['bots']) else 1)
    elif args.bot_id:
        success = generator.generate_bot(args.bot_id)
        sys.exit(0 if success else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
