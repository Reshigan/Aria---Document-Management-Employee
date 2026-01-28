/**
 * User Onboarding Wizard Component
 * First-time setup wizard for new companies/users in the ARIA ERP system
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActionArea,
  LinearProgress,
} from '@mui/material';
import {
  Business,
  AccountBalance,
  Settings,
  People,
  Inventory,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  Rocket,
} from '@mui/icons-material';
import { dataSeedingService, CompanySetupData, SeedingOptions } from '../services/DataSeedingService';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface WizardState {
  // Step 1: Company Info
  companyName: string;
  registrationNumber: string;
  vatNumber: string;
  industry: string;
  // Step 2: Address
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  // Step 3: Financial Settings
  currency: string;
  timezone: string;
  financialYearEnd: number;
  // Step 4: Bank Details
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountType: string;
  // Step 5: Modules & Data
  selectedModules: string[];
  includeDemoData: boolean;
  demoDataSize: 'small' | 'medium' | 'large';
}

const initialState: WizardState = {
  companyName: '',
  registrationNumber: '',
  vatNumber: '',
  industry: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  email: '',
  website: '',
  currency: 'ZAR',
  timezone: 'Africa/Johannesburg',
  financialYearEnd: 2,
  bankName: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'current',
  selectedModules: ['financial', 'sales', 'purchasing', 'inventory'],
  includeDemoData: true,
  demoDataSize: 'medium',
};

const steps = [
  { label: 'Company Info', icon: <Business /> },
  { label: 'Contact Details', icon: <People /> },
  { label: 'Financial Settings', icon: <AccountBalance /> },
  { label: 'Bank Details', icon: <AccountBalance /> },
  { label: 'Modules & Data', icon: <Settings /> },
  { label: 'Complete', icon: <CheckCircle /> },
];

const industries = [
  'Retail',
  'Manufacturing',
  'Professional Services',
  'Technology',
  'Healthcare',
  'Construction',
  'Hospitality',
  'Agriculture',
  'Transportation',
  'Education',
  'Other',
];

const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const currencies = [
  { code: 'ZAR', name: 'South African Rand (R)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
];

const timezones = [
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const availableModules = [
  { id: 'financial', name: 'Financial Management', description: 'GL, AP, AR, Banking' },
  { id: 'sales', name: 'Sales & CRM', description: 'Quotes, Orders, Customers' },
  { id: 'purchasing', name: 'Purchasing', description: 'POs, Suppliers, RFQs' },
  { id: 'inventory', name: 'Inventory', description: 'Stock, Warehouses, Products' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'BOMs, Work Orders, Production' },
  { id: 'hr', name: 'HR & Payroll', description: 'Employees, Leave, Payroll' },
  { id: 'projects', name: 'Projects', description: 'Tasks, Timesheets, Milestones' },
  { id: 'field_service', name: 'Field Service', description: 'Work Orders, Scheduling' },
];

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupProgress, setSetupProgress] = useState(0);
  const [setupStatus, setSetupStatus] = useState<string>('');

  const handleChange = (field: keyof WizardState) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleCheckboxChange = (field: keyof WizardState) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setState((prev) => ({
      ...prev,
      [field]: event.target.checked,
    }));
  };

  const handleModuleToggle = (moduleId: string) => {
    setState((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(moduleId)
        ? prev.selectedModules.filter((m) => m !== moduleId)
        : [...prev.selectedModules, moduleId],
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!state.companyName && !!state.industry;
      case 1:
        return !!state.street && !!state.city && !!state.phone && !!state.email;
      case 2:
        return !!state.currency && !!state.timezone;
      case 3:
        return true; // Bank details are optional
      case 4:
        return state.selectedModules.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
      setError(null);
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Initialize company
      setSetupStatus('Setting up company...');
      setSetupProgress(10);

      const companyData: CompanySetupData = {
        companyName: state.companyName,
        registrationNumber: state.registrationNumber || undefined,
        vatNumber: state.vatNumber || undefined,
        address: {
          street: state.street,
          city: state.city,
          province: state.province,
          postalCode: state.postalCode,
          country: state.country,
        },
        phone: state.phone,
        email: state.email,
        website: state.website || undefined,
        industry: state.industry,
        financialYearEnd: state.financialYearEnd,
        currency: state.currency,
        timezone: state.timezone,
        bankDetails: state.bankName
          ? {
              bankName: state.bankName,
              accountNumber: state.accountNumber,
              branchCode: state.branchCode,
              accountType: state.accountType,
            }
          : undefined,
      };

      const companyResult = await dataSeedingService.initializeCompany(companyData);
      if (!companyResult.success) {
        throw new Error(companyResult.error || 'Failed to initialize company');
      }

      // Step 2: Seed master data
      setSetupStatus('Creating chart of accounts, tax rates, and payment terms...');
      setSetupProgress(30);

      const seedingOptions: SeedingOptions = {
        modules: state.selectedModules,
        skipExisting: true,
      };

      await dataSeedingService.seedMasterData(seedingOptions);

      // Step 3: Seed demo data if requested
      if (state.includeDemoData) {
        setSetupStatus('Creating demo data...');
        setSetupProgress(60);

        await dataSeedingService.seedDemoData({
          ...seedingOptions,
          includeDemoData: true,
          demoDataSize: state.demoDataSize,
        });
      }

      // Step 4: Complete
      setSetupStatus('Finalizing setup...');
      setSetupProgress(90);

      // Small delay for visual feedback
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSetupProgress(100);
      setSetupStatus('Setup complete!');

      // Wait a moment before completing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      onComplete();
    } catch (err) {
      console.error('Setup error:', err);
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Tell us about your company
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Company Name"
                  value={state.companyName}
                  onChange={handleChange('companyName')}
                  placeholder="Enter your company name"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Registration Number"
                  value={state.registrationNumber}
                  onChange={handleChange('registrationNumber')}
                  placeholder="e.g., 2020/123456/07"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="VAT Number"
                  value={state.vatNumber}
                  onChange={handleChange('vatNumber')}
                  placeholder="e.g., 4123456789"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Industry</InputLabel>
                  <Select
                    value={state.industry}
                    label="Industry"
                    onChange={handleChange('industry') as never}
                  >
                    {industries.map((industry) => (
                      <MenuItem key={industry} value={industry}>
                        {industry}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Contact Details
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  label="Street Address"
                  value={state.street}
                  onChange={handleChange('street')}
                  placeholder="Enter street address"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="City"
                  value={state.city}
                  onChange={handleChange('city')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Province</InputLabel>
                  <Select
                    value={state.province}
                    label="Province"
                    onChange={handleChange('province') as never}
                  >
                    {provinces.map((province) => (
                      <MenuItem key={province} value={province}>
                        {province}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Postal Code"
                  value={state.postalCode}
                  onChange={handleChange('postalCode')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  value={state.country}
                  onChange={handleChange('country')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Phone"
                  value={state.phone}
                  onChange={handleChange('phone')}
                  placeholder="+27 11 123 4567"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  required
                  fullWidth
                  label="Email"
                  type="email"
                  value={state.email}
                  onChange={handleChange('email')}
                  placeholder="info@company.co.za"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Website"
                  value={state.website}
                  onChange={handleChange('website')}
                  placeholder="https://www.company.co.za"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Financial Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Currency</InputLabel>
                  <Select
                    value={state.currency}
                    label="Currency"
                    onChange={handleChange('currency') as never}
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={state.timezone}
                    label="Timezone"
                    onChange={handleChange('timezone') as never}
                  >
                    {timezones.map((tz) => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Financial Year End</InputLabel>
                  <Select
                    value={state.financialYearEnd}
                    label="Financial Year End"
                    onChange={handleChange('financialYearEnd') as never}
                  >
                    {months.map((month, index) => (
                      <MenuItem key={month} value={index + 1}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Bank Details (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add your bank details to display on invoices and enable payment reconciliation.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Bank Name"
                  value={state.bankName}
                  onChange={handleChange('bankName')}
                  placeholder="e.g., First National Bank"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Account Number"
                  value={state.accountNumber}
                  onChange={handleChange('accountNumber')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Branch Code"
                  value={state.branchCode}
                  onChange={handleChange('branchCode')}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={state.accountType}
                    label="Account Type"
                    onChange={handleChange('accountType') as never}
                  >
                    <MenuItem value="current">Current Account</MenuItem>
                    <MenuItem value="savings">Savings Account</MenuItem>
                    <MenuItem value="cheque">Cheque Account</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        );

      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Modules & Data Options
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose which modules to enable and whether to include demo data for testing.
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Modules
            </Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {availableModules.map((module) => (
                <Grid item xs={12} sm={6} md={4} key={module.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: state.selectedModules.includes(module.id)
                        ? 'primary.main'
                        : 'divider',
                      bgcolor: state.selectedModules.includes(module.id)
                        ? 'primary.50'
                        : 'background.paper',
                    }}
                  >
                    <CardActionArea onClick={() => handleModuleToggle(module.id)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Checkbox
                            checked={state.selectedModules.includes(module.id)}
                            sx={{ p: 0, mr: 1 }}
                          />
                          <Typography variant="subtitle2">{module.name}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {module.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Demo Data
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={state.includeDemoData}
                  onChange={handleCheckboxChange('includeDemoData')}
                />
              }
              label="Include demo data for testing and training"
            />
            {state.includeDemoData && (
              <Box sx={{ mt: 2, ml: 4 }}>
                <FormControl size="small">
                  <InputLabel>Data Size</InputLabel>
                  <Select
                    value={state.demoDataSize}
                    label="Data Size"
                    onChange={handleChange('demoDataSize') as never}
                  >
                    <MenuItem value="small">Small (5 customers, 10 products)</MenuItem>
                    <MenuItem value="medium">Medium (20 customers, 50 products)</MenuItem>
                    <MenuItem value="large">Large (100 customers, 200 products)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        );

      case 5:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {loading ? (
              <>
                <CircularProgress size={60} sx={{ mb: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Setting up your account...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {setupStatus}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={setupProgress}
                  sx={{ maxWidth: 400, mx: 'auto' }}
                />
              </>
            ) : (
              <>
                <Rocket sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Ready to Launch!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  We'll set up your company with the following:
                </Typography>
                <Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto', mb: 4 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                    Company: <strong>{state.companyName}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                    Currency: <strong>{state.currency}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                    Modules: <strong>{state.selectedModules.length} selected</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                    Chart of Accounts, Tax Rates, Payment Terms
                  </Typography>
                  {state.includeDemoData && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <CheckCircle sx={{ fontSize: 16, mr: 1, color: 'success.main' }} />
                      Demo data ({state.demoDataSize})
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleComplete}
                  startIcon={<Rocket />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    px: 4,
                    py: 1.5,
                  }}
                >
                  Complete Setup
                </Button>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 900,
          width: '100%',
          p: 4,
          borderRadius: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Welcome to ARIA ERP
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Let's get your business set up in just a few steps
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ minHeight: 400 }}>{renderStepContent(activeStep)}</Box>

        {activeStep < 5 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBack />}
            >
              Back
            </Button>
            <Box>
              {onSkip && activeStep === 0 && (
                <Button onClick={onSkip} sx={{ mr: 2 }}>
                  Skip Setup
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForward />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {activeStep === 4 ? 'Review' : 'Next'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default OnboardingWizard;
