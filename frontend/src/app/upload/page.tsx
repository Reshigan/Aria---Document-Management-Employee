'use client';

import { useState, useRef } from 'react';
import { Upload, message, Progress, Card, Button, List, Tag, Spin } from 'antd';
import { 
  CloudUploadOutlined, 
  FileTextOutlined, 
  EyeOutlined, 
  SendOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  ScanOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import api from '@/lib/api';

const { Dragger } = Upload;

interface DocumentData {
  filename: string;
  extractedText: string;
  ocrData: any;
  sapData?: any;
  status: 'uploaded' | 'processing' | 'scanned' | 'posted' | 'error';
  progress: number;
}

export default function DocumentUploadPage() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.pdf,.jpg,.jpeg,.png,.tiff,.bmp',
    fileList,
    beforeUpload: (file) => {
      const isValidType = [
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/tiff',
        'image/bmp'
      ].includes(file.type);
      
      if (!isValidType) {
        message.error('You can only upload PDF, JPG, PNG, TIFF, or BMP files!');
        return false;
      }
      
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }
      
      return false; // Prevent automatic upload
    },
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Please select files to upload');
      return;
    }

    setUploading(true);
    const newDocuments: DocumentData[] = [];

    try {
      for (const file of fileList) {
        if (file.originFileObj) {
          const formData = new FormData();
          formData.append('file', file.originFileObj);

          // Add document to processing list
          const docData: DocumentData = {
            filename: file.name,
            extractedText: '',
            ocrData: null,
            status: 'uploaded',
            progress: 0
          };
          newDocuments.push(docData);
          setDocuments(prev => [...prev, docData]);

          try {
            // Update progress
            docData.status = 'processing';
            docData.progress = 25;
            setDocuments(prev => [...prev]);

            // Upload and process document
            const uploadResponse = await api.post('/api/documents/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            docData.progress = 50;
            setDocuments(prev => [...prev]);

            // Perform OCR scanning
            const ocrResponse = await api.post(`/api/documents/${uploadResponse.id}/ocr`);

            docData.extractedText = ocrResponse.extracted_text || '';
            docData.ocrData = ocrResponse;
            docData.status = 'scanned';
            docData.progress = 75;
            setDocuments(prev => [...prev]);

            // Post to SAP
            await postToSAP(docData, uploadResponse.id);

          } catch (error: any) {
            console.error('Error processing document:', error);
            docData.status = 'error';
            docData.progress = 100;
            setDocuments(prev => [...prev]);
            message.error(`Failed to process ${file.name}: ${error.response?.data?.detail || error.message}`);
          }
        }
      }

      message.success('All documents processed successfully!');
      setFileList([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const postToSAP = async (docData: DocumentData, documentId: string) => {
    try {
      // Extract key information for SAP posting
      const sapPayload = {
        document_id: documentId,
        filename: docData.filename,
        extracted_data: docData.ocrData,
        text_content: docData.extractedText
      };

      const sapResponse = await api.post('/api/sap/post-document', sapPayload);
      
      docData.sapData = sapResponse.data;
      docData.status = 'posted';
      docData.progress = 100;
      setDocuments(prev => [...prev]);
      
      message.success(`${docData.filename} successfully posted to SAP!`);
    } catch (error: any) {
      console.error('SAP posting error:', error);
      docData.status = 'error';
      docData.progress = 100;
      setDocuments(prev => [...prev]);
      message.error(`Failed to post ${docData.filename} to SAP: ${error.response?.data?.detail || error.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'blue';
      case 'processing': return 'orange';
      case 'scanned': return 'cyan';
      case 'posted': return 'green';
      case 'error': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded': return <CloudUploadOutlined />;
      case 'processing': return <LoadingOutlined spin />;
      case 'scanned': return <ScanOutlined />;
      case 'posted': return <CheckCircleOutlined />;
      case 'error': return <span>❌</span>;
      default: return <FileTextOutlined />;
    }
  };

  return (
    <>
      {/* Particle Background */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="futuristic-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(45deg, var(--accent-neon), var(--primary-cyan))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)'
            }}>
              <CloudUploadOutlined style={{ fontSize: '24px', color: 'white' }} />
            </div>
            <div>
              <h1 className="glow-text" style={{ fontSize: '28px', fontWeight: '600', margin: 0 }}>
                Document Upload & SAP Integration
              </h1>
              <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Upload documents for AI scanning and automatic SAP posting
              </p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="futuristic-card" style={{ 
            padding: '32px', 
            background: 'rgba(0, 255, 136, 0.05)',
            border: '2px dashed var(--accent-neon)'
          }}>
            <Dragger {...uploadProps} style={{ 
              background: 'transparent',
              border: 'none'
            }}>
              <div style={{ padding: '40px 20px' }}>
                <div style={{
                  fontSize: '48px',
                  color: 'var(--accent-neon)',
                  marginBottom: '16px',
                  textShadow: '0 0 10px var(--accent-neon)'
                }}>
                  <CloudUploadOutlined />
                </div>
                <h3 style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: '20px', 
                  marginBottom: '8px' 
                }}>
                  Drop files here or click to upload
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Supports PDF, JPG, PNG, TIFF, BMP files up to 10MB
                </p>
              </div>
            </Dragger>
          </div>

          {fileList.length > 0 && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button 
                className="neon-button"
                onClick={handleUpload}
                disabled={uploading}
                style={{ 
                  minWidth: '200px',
                  height: '48px',
                  fontSize: '16px'
                }}
              >
                {uploading ? (
                  <>
                    <LoadingOutlined spin style={{ marginRight: '8px' }} />
                    Processing...
                  </>
                ) : (
                  <>
                    <RobotOutlined style={{ marginRight: '8px' }} />
                    Scan & Post to SAP
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Processing Status */}
        {documents.length > 0 && (
          <div className="futuristic-card" style={{ padding: '24px' }}>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ScanOutlined style={{ color: 'var(--primary-cyan)' }} />
              Document Processing Status
            </h2>
            
            <List
              dataSource={documents}
              renderItem={(doc, index) => (
                <List.Item
                  className="message-bubble"
                  style={{
                    background: 'rgba(26, 26, 46, 0.6)',
                    border: '1px solid var(--border-glow)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `linear-gradient(45deg, var(--primary-cyan), var(--accent-neon))`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 10px rgba(0, 245, 255, 0.3)'
                        }}>
                          {getStatusIcon(doc.status)}
                        </div>
                        <span style={{ 
                          color: 'var(--text-primary)', 
                          fontWeight: '500',
                          fontSize: '16px'
                        }}>
                          {doc.filename}
                        </span>
                      </div>
                      <Tag 
                        color={getStatusColor(doc.status)}
                        style={{ 
                          borderRadius: '12px',
                          padding: '4px 12px',
                          fontWeight: '500'
                        }}
                      >
                        {doc.status.toUpperCase()}
                      </Tag>
                    </div>
                    
                    <Progress 
                      percent={doc.progress} 
                      strokeColor={{
                        '0%': 'var(--primary-cyan)',
                        '100%': 'var(--accent-neon)',
                      }}
                      trailColor="rgba(255, 255, 255, 0.1)"
                      style={{ marginBottom: '12px' }}
                    />
                    
                    {doc.extractedText && (
                      <div style={{
                        background: 'rgba(0, 245, 255, 0.05)',
                        border: '1px solid rgba(0, 245, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px'
                      }}>
                        <h4 style={{ 
                          color: 'var(--primary-cyan)', 
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}>
                          Extracted Text Preview:
                        </h4>
                        <p style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '12px',
                          lineHeight: '1.4',
                          maxHeight: '60px',
                          overflow: 'hidden'
                        }}>
                          {doc.extractedText.substring(0, 200)}...
                        </p>
                      </div>
                    )}
                    
                    {doc.sapData && (
                      <div style={{
                        background: 'rgba(0, 255, 136, 0.05)',
                        border: '1px solid rgba(0, 255, 136, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px'
                      }}>
                        <h4 style={{ 
                          color: 'var(--accent-neon)', 
                          marginBottom: '8px',
                          fontSize: '14px'
                        }}>
                          SAP Integration Status:
                        </h4>
                        <p style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '12px'
                        }}>
                          Document successfully posted to SAP system
                        </p>
                      </div>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="futuristic-card" style={{ 
          padding: '20px', 
          marginTop: '24px',
          background: 'rgba(0, 245, 255, 0.05)',
          border: '1px solid rgba(0, 245, 255, 0.2)'
        }}>
          <h3 style={{ 
            color: 'var(--primary-cyan)', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <RobotOutlined />
            How ARIA Processes Your Documents
          </h3>
          <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p><strong>1. Upload:</strong> Select and upload your documents (PDF, images)</p>
            <p><strong>2. AI Scanning:</strong> ARIA uses advanced OCR to extract text and data</p>
            <p><strong>3. Data Processing:</strong> Key information is identified and structured</p>
            <p><strong>4. SAP Integration:</strong> Documents are automatically posted to your SAP system</p>
          </div>
        </div>
      </div>
    </>
  );
}