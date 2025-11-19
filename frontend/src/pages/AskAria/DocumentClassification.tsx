import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '@/lib/api';

interface DocumentData {
  document_id: string;
  filename: string;
  status: string;
  classification?: {
    doc_type: string;
    template_id: string;
    module: string;
    confidence: number;
    method: string;
    extracted_fields: Record<string, any>;
  };
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  posting?: {
    success: boolean;
    posting_id?: string;
    export_file_path?: string;
    export_file_url?: string;
    template_name?: string;
    sap_tcode?: string;
    message?: string;
    warnings?: string[];
  };
}

interface LineItem {
  line_no?: number;
  [key: string]: any;
}

const steps = ['Upload Document', 'Review Classification', 'Choose Destination', 'Validate & Export'];

const DocumentClassification: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<'aria' | 'sap'>('sap');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [headerFields, setHeaderFields] = useState<Record<string, any>>({});
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ key: string; value: any } | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/ask-aria/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const documentId = uploadResponse.data.document_id;

      const classifyResponse = await api.post(`/ask-aria/classify/${documentId}`);

      const extractResponse = await api.post(`/ask-aria/extract/${documentId}`);

      setDocumentData({
        document_id: documentId,
        filename: file.name,
        status: 'classified',
        classification: {
          doc_type: classifyResponse.data.document_class,
          template_id: classifyResponse.data.template_id || '',
          module: classifyResponse.data.module || '',
          confidence: classifyResponse.data.confidence,
          method: classifyResponse.data.method || 'rules',
          extracted_fields: extractResponse.data.fields || {},
        },
      });

      setHeaderFields(extractResponse.data.fields || {});
      setLineItems(extractResponse.data.line_items || []);
      setActiveStep(1);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || 'Failed to upload and classify document');
    } finally {
      setLoading(false);
    }
  };

  const handleReclassify = async (newDocType: string) => {
    if (!documentData) return;

    try {
      setLoading(true);
      const response = await api.post('/ask-aria/sap/reclassify', {
        document_id: documentData.document_id,
        suggested_type: newDocType,
      });

      setDocumentData({
        ...documentData,
        classification: {
          ...documentData.classification!,
          doc_type: response.data.doc_type,
          confidence: response.data.confidence,
          method: 'manual',
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reclassify document');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!documentData) return;

    try {
      setLoading(true);
      const response = await api.post(`/ask-aria/documents/${documentData.document_id}/validate`, {
        doc_type: documentData.classification!.doc_type,
        header_data: headerFields,
        line_items: lineItems,
      });

      setDocumentData({
        ...documentData,
        validation: response.data,
      });

      if (response.data.valid) {
        setActiveStep(3);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate document');
    } finally {
      setLoading(false);
    }
  };

  const handlePostToAria = async () => {
    if (!documentData) return;

    try {
      setLoading(true);
      const response = await api.post(`/ask-aria/documents/${documentData.document_id}/post-to-aria`, {
        doc_type: documentData.classification!.doc_type,
        header_data: headerFields,
        line_items: lineItems,
      });

      setDocumentData({
        ...documentData,
        posting: response.data,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post to ARIA');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToSap = async () => {
    if (!documentData) return;

    try {
      setLoading(true);
      const response = await api.post(`/ask-aria/documents/${documentData.document_id}/export-to-sap`, {
        doc_type: documentData.classification!.doc_type,
        header_data: headerFields,
        line_items: lineItems,
        export_format: exportFormat,
      });

      setDocumentData({
        ...documentData,
        posting: response.data,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to export to SAP');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExport = async () => {
    if (!documentData?.posting?.posting_id) return;

    try {
      const response = await api.get(
        `/ask-aria/documents/${documentData.document_id}/download-export/${documentData.posting.posting_id}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAP_Export_${documentData.classification?.doc_type}_${Date.now()}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Failed to download export file');
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setDocumentData(null);
    setHeaderFields({});
    setLineItems([]);
    setError(null);
    setDestination('sap');
    setExportFormat('xlsx');
  };

  const handleEditField = (key: string, value: any) => {
    setEditingField({ key, value });
    setEditDialogOpen(true);
  };

  const handleSaveField = () => {
    if (editingField) {
      setHeaderFields({
        ...headerFields,
        [editingField.key]: editingField.value,
      });
      setEditDialogOpen(false);
      setEditingField(null);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { line_no: lineItems.length + 1 }]);
  };

  const handleDeleteLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  React.useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await api.get('/ask-aria/sap/export-templates');
        setAvailableTemplates(response.data.templates || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Universal Document Classification & SAP Export
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload any business document, classify it, and export to SAP or post to ARIA ERP
      </Typography>

      <Stepper activeStep={activeStep} sx={{ my: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Step 1: Upload */}
      {activeStep === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload Document
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Supported formats: Excel, PDF, Images (JPG, PNG)
              </Typography>
              <input
                accept=".xlsx,.xls,.pdf,image/*"
                style={{ display: 'none' }}
                id="document-upload"
                type="file"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <label htmlFor="document-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Processing...' : 'Choose File'}
                </Button>
              </label>
              {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 2 }} />}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Classification */}
      {activeStep === 1 && documentData && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Classification Results
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Document Type
                    </Typography>
                    <Chip
                      label={documentData.classification?.doc_type}
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence
                    </Typography>
                    <Chip
                      label={`${(documentData.classification!.confidence * 100).toFixed(0)}%`}
                      color={documentData.classification!.confidence > 0.7 ? 'success' : 'warning'}
                      sx={{ mt: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Module
                    </Typography>
                    <Typography variant="body1">{documentData.classification?.module}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      Method
                    </Typography>
                    <Typography variant="body1">{documentData.classification?.method}</Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Reclassify Document (if needed)
                </Typography>
                <FormControl fullWidth sx={{ mt: 1 }}>
                  <InputLabel>Document Type</InputLabel>
                  <Select
                    value={documentData.classification?.doc_type}
                    onChange={(e) => handleReclassify(e.target.value)}
                    disabled={loading}
                  >
                    {availableTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.doc_type}>
                        {template.name} ({template.sap_tcode})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={handleReset}>Start Over</Button>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(2)}
                  >
                    Continue
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Extracted Fields
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Field</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(headerFields).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell>{key}</TableCell>
                          <TableCell>{String(value)}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleEditField(key, value)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {lineItems.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Line Items</Typography>
                    <Button startIcon={<AddIcon />} onClick={handleAddLineItem}>
                      Add Line
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Line No</TableCell>
                          {lineItems[0] && Object.keys(lineItems[0]).filter(k => k !== 'line_no').map(key => (
                            <TableCell key={key}>{key}</TableCell>
                          ))}
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lineItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            {Object.entries(item).filter(([k]) => k !== 'line_no').map(([key, value]) => (
                              <TableCell key={key}>
                                <TextField
                                  size="small"
                                  value={value || ''}
                                  onChange={(e) => handleUpdateLineItem(index, key, e.target.value)}
                                  fullWidth
                                />
                              </TableCell>
                            ))}
                            <TableCell align="right">
                              <IconButton size="small" onClick={() => handleDeleteLineItem(index)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Step 3: Choose Destination */}
      {activeStep === 2 && documentData && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Choose Destination
            </Typography>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: destination === 'aria' ? 2 : 1,
                    borderColor: destination === 'aria' ? 'primary.main' : 'divider',
                  }}
                  onClick={() => setDestination('aria')}
                >
                  <CardContent>
                    <Typography variant="h6">Post to ARIA ERP</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Post this document directly to ARIA ERP system
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: destination === 'sap' ? 2 : 1,
                    borderColor: destination === 'sap' ? 'primary.main' : 'divider',
                  }}
                  onClick={() => setDestination('sap')}
                >
                  <CardContent>
                    <Typography variant="h6">Export to SAP</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Generate SAP import template for upload
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {destination === 'sap' && (
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'xlsx' | 'csv')}
                  >
                    <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                    <MenuItem value="csv">CSV (.csv)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button onClick={() => setActiveStep(1)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleValidate}
                disabled={loading}
              >
                {loading ? 'Validating...' : 'Validate & Continue'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Validate & Export */}
      {activeStep === 3 && documentData && (
        <Grid container spacing={3}>
          {documentData.validation && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Validation Results
                  </Typography>
                  {documentData.validation.valid ? (
                    <Alert severity="success" icon={<CheckIcon />}>
                      Document validation passed!
                    </Alert>
                  ) : (
                    <Alert severity="error" icon={<ErrorIcon />}>
                      Document validation failed
                    </Alert>
                  )}

                  {documentData.validation.errors.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="error">
                        Errors:
                      </Typography>
                      <List dense>
                        {documentData.validation.errors.map((error, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={error} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {documentData.validation.warnings.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="warning.main">
                        Warnings:
                      </Typography>
                      <List dense>
                        {documentData.validation.warnings.map((warning, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={warning} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {destination === 'aria' ? 'Post to ARIA ERP' : 'Export to SAP'}
                </Typography>

                {!documentData.posting ? (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {destination === 'aria'
                        ? 'Click below to post this document to ARIA ERP'
                        : `Click below to generate SAP ${exportFormat.toUpperCase()} export file`}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                      <Button onClick={() => setActiveStep(2)}>Back</Button>
                      <Button
                        variant="contained"
                        onClick={destination === 'aria' ? handlePostToAria : handleExportToSap}
                        disabled={loading || !documentData.validation?.valid}
                        startIcon={destination === 'sap' ? <DownloadIcon /> : undefined}
                      >
                        {loading
                          ? 'Processing...'
                          : destination === 'aria'
                          ? 'Post to ARIA'
                          : 'Generate SAP Export'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    {documentData.posting.success ? (
                      <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
                        {documentData.posting.message}
                      </Alert>
                    ) : (
                      <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
                        {documentData.posting.message || 'Operation failed'}
                      </Alert>
                    )}

                    {documentData.posting.warnings && documentData.posting.warnings.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2">Warnings:</Typography>
                        <List dense>
                          {documentData.posting.warnings.map((warning, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={warning} />
                            </ListItem>
                          ))}
                        </List>
                      </Alert>
                    )}

                    {destination === 'sap' && documentData.posting.success && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Template:</strong> {documentData.posting.template_name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>SAP Transaction:</strong> {documentData.posting.sap_tcode}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadExport}
                          sx={{ mt: 2 }}
                        >
                          Download Export File
                        </Button>
                      </Box>
                    )}

                    <Box sx={{ mt: 3 }}>
                      <Button variant="outlined" onClick={handleReset}>
                        Process Another Document
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Edit Field Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Field</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Field Name"
            value={editingField?.key || ''}
            disabled
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Value"
            value={editingField?.value || ''}
            onChange={(e) => setEditingField({ ...editingField!, value: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveField} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentClassification;
