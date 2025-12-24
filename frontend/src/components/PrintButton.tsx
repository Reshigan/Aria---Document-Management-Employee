import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';

interface PrintButtonProps {
  documentType: 'invoice' | 'quote' | 'purchase-order' | 'sales-order' | 'delivery';
  documentId: string;
  label?: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
}

const PrintButton: React.FC<PrintButtonProps> = ({
  documentType,
  documentId,
  label = 'Print',
  variant = 'outlined',
  size = 'small'
}) => {
  const [loading, setLoading] = React.useState(false);

  const handlePrint = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev/api'}/print/${documentType}/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentType}_${documentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error printing document:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={loading ? <CircularProgress size={16} /> : <PrintIcon />}
      onClick={handlePrint}
      disabled={loading}
    >
      {label}
    </Button>
  );
};

export default PrintButton;
