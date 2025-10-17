import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Save,
  Server,
  FileText,
  Settings as SettingsIcon,
  Palette,
  Globe,
  Bell,
  Shield,
  Database,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings } from '@/types';

const settingsSchema = z.object({
  sapConfig: z.object({
    server: z.string().min(1, 'Server URL is required'),
    client: z.string().min(1, 'Client ID is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().optional(),
  }),
  documentMappings: z.object({
    invoices: z.string().min(1, 'Invoice path is required'),
    contracts: z.string().min(1, 'Contract path is required'),
    reports: z.string().min(1, 'Report path is required'),
  }),
  thresholds: z.object({
    maxFileSize: z.number().min(1, 'Max file size must be at least 1MB'),
    autoProcessing: z.boolean(),
    retentionDays: z.number().min(1, 'Retention days must be at least 1'),
  }),
  systemSettings: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string().min(1, 'Language is required'),
    notifications: z.boolean(),
    autoBackup: z.boolean(),
  }),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const defaultSettings: SettingsFormData = {
  sapConfig: {
    server: 'https://sap.company.com',
    client: '100',
    username: 'aria_user',
    password: '',
  },
  documentMappings: {
    invoices: '/documents/invoices',
    contracts: '/documents/contracts',
    reports: '/documents/reports',
  },
  thresholds: {
    maxFileSize: 50,
    autoProcessing: true,
    retentionDays: 365,
  },
  systemSettings: {
    theme: 'system',
    language: 'en',
    notifications: true,
    autoBackup: true,
  },
};

const API_BASE_URL = 'https://work-2-czpjnhgxrrmdnkmu.prod-runtime.all-hands.dev/api/v1';

export function Settings() {
  const [activeTab, setActiveTab] = useState('sap');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaultSettings,
  });

  // Load settings from backend on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoadingData(true);
        const response = await fetch(`${API_BASE_URL}/config`);
        if (response.ok) {
          const settings = await response.json();
          reset(settings);
        } else {
          console.error('Failed to load settings:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsFormData) => {
    console.log('Form submission started', { data, isDirty });
    alert('Form submission started!');
    setIsLoading(true);
    try {
      console.log('Making API call to:', `${API_BASE_URL}/config`);
      const response = await fetch(`${API_BASE_URL}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('API response received:', { status: response.status, ok: response.ok });
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('Settings saved successfully', responseData);
        // Reset form with current values to clear dirty state
        reset(data);
        console.log('Form reset called, isDirty should now be false');
        // Show success message
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error message
    } finally {
      setIsLoading(false);
      console.log('Form submission completed, isLoading set to false');
    }
  };

  const tabs = [
    { id: 'sap', label: 'SAP Configuration', icon: Server },
    { id: 'documents', label: 'Document Mappings', icon: FileText },
    { id: 'thresholds', label: 'Thresholds', icon: SettingsIcon },
    { id: 'system', label: 'System Settings', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure system preferences and integrations
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {isLoadingData ? (
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading settings...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              {activeTab === 'sap' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-semibold mb-2">SAP Configuration</h2>
                    <p className="text-muted-foreground">
                      Configure SAP system connection settings
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Server URL</label>
                      <input
                        {...register('sapConfig.server')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://sap.company.com"
                      />
                      {errors.sapConfig?.server && (
                        <p className="text-sm text-destructive">
                          {errors.sapConfig.server.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client ID</label>
                      <input
                        {...register('sapConfig.client')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="100"
                      />
                      {errors.sapConfig?.client && (
                        <p className="text-sm text-destructive">
                          {errors.sapConfig.client.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <input
                        {...register('sapConfig.username')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="aria_user"
                      />
                      {errors.sapConfig?.username && (
                        <p className="text-sm text-destructive">
                          {errors.sapConfig.username.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Password</label>
                      <input
                        {...register('sapConfig.password')}
                        type="password"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="••••••••"
                      />
                      {errors.sapConfig?.password && (
                        <p className="text-sm text-destructive">
                          {errors.sapConfig.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <p className="text-sm text-blue-800">
                      Connection credentials are encrypted and stored securely
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'documents' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Document Mappings</h2>
                    <p className="text-muted-foreground">
                      Configure document type mappings and storage paths
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Invoice Path</label>
                      <input
                        {...register('documentMappings.invoices')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="/documents/invoices"
                      />
                      {errors.documentMappings?.invoices && (
                        <p className="text-sm text-destructive">
                          {errors.documentMappings.invoices.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contract Path</label>
                      <input
                        {...register('documentMappings.contracts')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="/documents/contracts"
                      />
                      {errors.documentMappings?.contracts && (
                        <p className="text-sm text-destructive">
                          {errors.documentMappings.contracts.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Report Path</label>
                      <input
                        {...register('documentMappings.reports')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="/documents/reports"
                      />
                      {errors.documentMappings?.reports && (
                        <p className="text-sm text-destructive">
                          {errors.documentMappings.reports.message}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'thresholds' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-semibold mb-2">System Thresholds</h2>
                    <p className="text-muted-foreground">
                      Configure processing limits and automation settings
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max File Size (MB)</label>
                      <input
                        {...register('thresholds.maxFileSize', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.thresholds?.maxFileSize && (
                        <p className="text-sm text-destructive">
                          {errors.thresholds.maxFileSize.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Retention Period (Days)</label>
                      <input
                        {...register('thresholds.retentionDays', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="3650"
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.thresholds?.retentionDays && (
                        <p className="text-sm text-destructive">
                          {errors.thresholds.retentionDays.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        {...register('thresholds.autoProcessing')}
                        type="checkbox"
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label className="text-sm font-medium">Enable Auto Processing</label>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'system' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-semibold mb-2">System Settings</h2>
                    <p className="text-muted-foreground">
                      Configure appearance and system preferences
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Theme</label>
                      <select
                        {...register('systemSettings.theme')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Language</label>
                      <select
                        {...register('systemSettings.language')}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          {...register('systemSettings.notifications')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label className="text-sm font-medium">Enable Notifications</label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          {...register('systemSettings.autoBackup')}
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label className="text-sm font-medium">Enable Auto Backup</label>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => reset()}
                  className="flex items-center gap-2 px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset
                </button>
              </div>

              <div className="flex items-center gap-2">
                {isDirty && (
                  <span className="text-sm text-muted-foreground">
                    You have unsaved changes
                  </span>
                )}
                {Object.keys(errors).length > 0 && (
                  <span className="text-sm text-red-600">
                    Form has errors: {JSON.stringify(errors)}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md transition-colors',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}