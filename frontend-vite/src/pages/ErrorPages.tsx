import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Lock, 
  Search, 
  Server, 
  Clock, 
  Home, 
  ArrowLeft,
  Mail,
  RefreshCw
} from 'lucide-react';

interface ErrorPageProps {
  title: string;
  message: string;
  description?: string;
  icon: React.ReactNode;
  statusCode: number;
  showRefresh?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  showSupport?: boolean;
}

const ErrorPageLayout: React.FC<ErrorPageProps> = ({
  title,
  message,
  description,
  icon,
  statusCode,
  showRefresh = true,
  showHome = true,
  showBack = true,
  showSupport = true
}) => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSupport = () => {
    const subject = encodeURIComponent(`Aria Support - Error ${statusCode}`);
    const body = encodeURIComponent(`
I encountered an error while using Aria:

Error Code: ${statusCode}
Page: ${window.location.href}
Time: ${new Date().toISOString()}
Browser: ${navigator.userAgent}

Description of what I was trying to do:
[Please describe what you were doing when this error occurred]
    `);
    
    window.open(`mailto:support@aria.vantax.co.za?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>

        {/* Status Code */}
        <div className="text-6xl font-bold text-gray-300 mb-4">
          {statusCode}
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {title}
        </h1>

        {/* Error Message */}
        <p className="text-xl text-gray-600 mb-4">
          {message}
        </p>

        {/* Error Description */}
        {description && (
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            {description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          {showRefresh && (
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>
          )}
          
          {showHome && (
            <button
              onClick={handleGoHome}
              className="flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Home className="w-5 h-5 mr-2" />
              Go Home
            </button>
          )}
          
          {showBack && (
            <button
              onClick={handleGoBack}
              className="flex items-center justify-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Go Back
            </button>
          )}
        </div>

        {/* Support Contact */}
        {showSupport && (
          <div className="border-t pt-6">
            <p className="text-sm text-gray-500 mb-4">
              Need help? Our support team is here to assist you.
            </p>
            <button
              onClick={handleSupport}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// 404 - Not Found
export const NotFoundPage: React.FC = () => (
  <ErrorPageLayout
    statusCode={404}
    title="Page Not Found"
    message="The page you're looking for doesn't exist."
    description="The page may have been moved, deleted, or you may have entered the wrong URL. Please check the address and try again."
    icon={<Search className="w-12 h-12 text-red-600" />}
  />
);

// 403 - Forbidden
export const ForbiddenPage: React.FC = () => (
  <ErrorPageLayout
    statusCode={403}
    title="Access Denied"
    message="You don't have permission to access this resource."
    description="This page is restricted. If you believe you should have access, please contact your administrator or try logging in with appropriate credentials."
    icon={<Lock className="w-12 h-12 text-red-600" />}
    showRefresh={false}
  />
);

// 401 - Unauthorized
export const UnauthorizedPage: React.FC = () => (
  <ErrorPageLayout
    statusCode={401}
    title="Authentication Required"
    message="You need to log in to access this page."
    description="Your session may have expired or you may not be logged in. Please log in and try again."
    icon={<Lock className="w-12 h-12 text-red-600" />}
    showRefresh={false}
  />
);

// 500 - Internal Server Error
export const InternalServerErrorPage: React.FC = () => (
  <ErrorPageLayout
    statusCode={500}
    title="Server Error"
    message="Something went wrong on our end."
    description="We're experiencing technical difficulties. Our team has been notified and is working to fix the issue. Please try again in a few minutes."
    icon={<Server className="w-12 h-12 text-red-600" />}
  />
);

// 503 - Service Unavailable
export const ServiceUnavailablePage: React.FC = () => (
  <ErrorPageLayout
    statusCode={503}
    title="Service Unavailable"
    message="The service is temporarily unavailable."
    description="We're performing scheduled maintenance or experiencing high traffic. Please try again in a few minutes."
    icon={<Clock className="w-12 h-12 text-red-600" />}
  />
);

// 429 - Too Many Requests
export const TooManyRequestsPage: React.FC = () => (
  <ErrorPageLayout
    statusCode={429}
    title="Too Many Requests"
    message="You're making requests too quickly."
    description="Please wait a moment before trying again. This helps us maintain service quality for all users."
    icon={<Clock className="w-12 h-12 text-red-600" />}
  />
);

// Generic Error Page
export const GenericErrorPage: React.FC<{ statusCode?: number; message?: string }> = ({ 
  statusCode = 500, 
  message = "An unexpected error occurred" 
}) => (
  <ErrorPageLayout
    statusCode={statusCode}
    title="Error"
    message={message}
    description="We apologize for the inconvenience. Our team has been notified and is working to resolve the issue."
    icon={<AlertTriangle className="w-12 h-12 text-red-600" />}
  />
);

// Maintenance Page
export const MaintenancePage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      {/* Maintenance Icon */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
          <Server className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Scheduled Maintenance
      </h1>

      {/* Message */}
      <p className="text-xl text-gray-600 mb-6">
        We're currently performing scheduled maintenance to improve your experience.
      </p>

      {/* Description */}
      <p className="text-gray-500 mb-8 max-w-lg mx-auto">
        Aria will be back online shortly. We appreciate your patience as we work to enhance our services.
      </p>

      {/* Estimated Time */}
      <div className="bg-blue-50 rounded-lg p-4 mb-8">
        <p className="text-blue-800 font-medium">
          Estimated completion: 30 minutes
        </p>
        <p className="text-blue-600 text-sm mt-1">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Contact Info */}
      <div className="border-t pt-6">
        <p className="text-sm text-gray-500 mb-4">
          For urgent matters, please contact our support team:
        </p>
        <a
          href="mailto:support@aria.vantax.co.za"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Mail className="w-4 h-4 mr-2" />
          support@aria.vantax.co.za
        </a>
      </div>
    </div>
  </div>
);

export default {
  NotFoundPage,
  ForbiddenPage,
  UnauthorizedPage,
  InternalServerErrorPage,
  ServiceUnavailablePage,
  TooManyRequestsPage,
  GenericErrorPage,
  MaintenancePage
};