/**
 * Services Index
 * Central export point for all production services in the ARIA ERP system
 */

// Document Generation Service
export {
  documentGenerationService,
  default as DocumentGenerationService,
} from './DocumentGenerationService';
export type {
  DocumentType,
  DocumentData,
  GenerateDocumentOptions,
} from './DocumentGenerationService';

// Email Notification Service
export {
  emailNotificationService,
  default as EmailNotificationService,
} from './EmailNotificationService';
export type {
  EmailTemplateType,
  EmailRecipient,
  EmailAttachment,
  EmailOptions,
  EmailResult,
  EmailTemplate,
} from './EmailNotificationService';

// Workflow Service
export {
  workflowService,
  default as WorkflowService,
} from './WorkflowService';
export type {
  WorkflowType,
  WorkflowStatus,
  WorkflowStep,
  WorkflowInstance,
  WorkflowDefinition,
} from './WorkflowService';

// RBAC Service
export {
  rbacService,
  default as RBACService,
  SYSTEM_ROLES,
  usePermission,
  withPermission,
} from './RBACService';
export type {
  PermissionAction,
  ResourceType,
  Permission,
  Role,
  UserPermissions,
} from './RBACService';

// Audit Trail Service
export {
  auditTrailService,
  default as AuditTrailService,
} from './AuditTrailService';
export type {
  AuditEventType,
  AuditSeverity,
  AuditEntry,
  AuditFilter,
  AuditStats,
} from './AuditTrailService';

// Data Seeding Service
export {
  dataSeedingService,
  default as DataSeedingService,
} from './DataSeedingService';
export type {
  SeedingProgress,
  SeedingResult,
  CompanySetupData,
  SeedingOptions,
} from './DataSeedingService';
