/**
 * eSignature Bot - Configuration Page
 * Generated: 2025-10-26 14:16:23
 */

import React, { useState, useEffect } from 'react';
import {
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
} from '@mui/material';
import { Save as SaveIcon, PlayArrow as PlayIcon } from '@mui/icons-material';

export default function EsignatureConfig() {
  const [config, setConfig] = useState({
    enabled: true,
    schedule: '0 */2 * * *',
    batch_size: 50,
    enable_notifications: true,
    dry_run: false,
    api_credentials: {}
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    // Load current configuration
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/bots/esignature/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/bots/esignature/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    try {
      const response = await fetch('/api/bots/esignature/execute', {
        method: 'POST'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Bot execution started!' });
      } else {
        throw new Error('Failed to start bot execution');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <Box sx={{ p: 3 }>
      <Typography variant="h4" gutterBottom>
        eSignature Bot
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Automates document signing workflows with integration to DocuSign, Adobe Sign
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }>
        <Grid item>
          <Chip label="Category: integration" />
        </Grid>
        <Grid item>
          <Chip label="Priority: CRITICAL" color="primary" />
        </Grid>
        <Grid item>
          <Chip label="Value: R40K-R80K/year saved" color="success" />
        </Grid>
      </Grid>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 3 }>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bot Configuration
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={(e) => setConfig({...config, enabled: e.target.checked})}
                  />
                }
                label="Enable Bot"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Schedule (Cron)"
                value={config.schedule}
                onChange={(e) => setConfig({...config, schedule: e.target.value})}
                helperText="Cron expression for scheduled execution"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Batch Size"
                value={config.batch_size}
                onChange={(e) => setConfig({...config, batch_size: parseInt(e.target.value)})}
                helperText="Number of items to process per batch"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enable_notifications}
                    onChange={(e) => setConfig({...config, enable_notifications: e.target.checked})}
                  />
                }
                label="Enable Notifications"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.dry_run}
                    onChange={(e) => setConfig({...config, dry_run: e.target.checked})}
                  />
                }
                label="Dry Run Mode"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Features
          </Typography>
          
          <Grid container spacing={1}>
            {[
              "Send documents for signature automatically", "Track signature status in real-time", "Multi-party signing workflows", "Sequential and parallel signing", "Signature reminders and escalations", "PDF form filling and signing", "Integration with DocuSign, Adobe Sign", "In-app signing (fallback)", "Certificate-based signatures (PKI)", "Signature audit trail"
            ].map((feature, index) => (
              <Grid item key={index}>
                <Chip label={feature} size="small" />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2 }>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          Save Configuration
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<PlayIcon />}
          onClick={handleExecute}
        >
          Execute Now
        </Button>
      </Box>
    </Box>
  );
}
