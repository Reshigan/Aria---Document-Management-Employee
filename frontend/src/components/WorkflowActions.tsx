import React from 'react';
import { Button, ButtonGroup, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from 'axios';

interface WorkflowActionsProps {
  documentType: 'quote' | 'sales_order' | 'purchase_order';
  documentId: string;
  currentStatus: string;
  onSuccess?: () => void;
}

const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  documentType,
  documentId,
  currentStatus,
  onSuccess
}) => {
  const [loading, setLoading] = React.useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);
  const [approvalNotes, setApprovalNotes] = React.useState('');

  const handleConvert = async (action: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      if (action === 'quote-to-so') {
        endpoint = `/api/workflows/quote-to-sales-order/${documentId}`;
      } else if (action === 'so-to-invoice') {
        endpoint = `/api/workflows/sales-order-to-invoice/${documentId}`;
      } else if (action === 'po-to-gr') {
        endpoint = `/api/workflows/purchase-order-to-goods-receipt/${documentId}`;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'https://aria.vantax.co.za'}${endpoint}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message || 'Document converted successfully!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error converting document:', error);
      alert(error.response?.data?.detail || 'Failed to convert document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'https://aria.vantax.co.za'}/api/workflows/approve/${documentType}/${documentId}`,
        { notes: approvalNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(response.data.message || 'Document approved successfully!');
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error approving document:', error);
      alert(error.response?.data?.detail || 'Failed to approve document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderActions = () => {
    if (documentType === 'quote' && currentStatus === 'DRAFT') {
      return (
        <ButtonGroup variant="outlined" size="small">
          <Button
            startIcon={<CheckCircleIcon />}
            onClick={() => setApprovalDialogOpen(true)}
            disabled={loading}
          >
            Approve
          </Button>
        </ButtonGroup>
      );
    }

    if (documentType === 'quote' && currentStatus === 'APPROVED') {
      return (
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
          onClick={() => handleConvert('quote-to-so')}
          disabled={loading}
        >
          Convert to Sales Order
        </Button>
      );
    }

    if (documentType === 'sales_order' && currentStatus === 'CONFIRMED') {
      return (
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
          onClick={() => handleConvert('so-to-invoice')}
          disabled={loading}
        >
          Create Invoice
        </Button>
      );
    }

    if (documentType === 'purchase_order' && currentStatus === 'DRAFT') {
      return (
        <ButtonGroup variant="outlined" size="small">
          <Button
            startIcon={<CheckCircleIcon />}
            onClick={() => setApprovalDialogOpen(true)}
            disabled={loading}
          >
            Approve
          </Button>
        </ButtonGroup>
      );
    }

    if (documentType === 'purchase_order' && currentStatus === 'APPROVED') {
      return (
        <Button
          variant="contained"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <ArrowForwardIcon />}
          onClick={() => handleConvert('po-to-gr')}
          disabled={loading}
        >
          Create Goods Receipt
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      {renderActions()}
      
      <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
        <DialogTitle>Approve Document</DialogTitle>
        <DialogContent>
          <TextField
            label="Approval Notes (Optional)"
            multiline
            rows={4}
            fullWidth
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowActions;
