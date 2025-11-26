import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
  CircularProgress,
  IconButton,
  Divider,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import api from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
  intent?: string;
  created_at: string;
}

const AskAriaChat: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    startNewSession();
  }, []);

  const startNewSession = async () => {
    try {
      setInitializing(true);
      const response = await api.post('/ask-aria/session', {
        intent: null,
      });

      setConversationId(response.data.conversation_id);
      
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: response.data.message,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to start session:', error);
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: 'Sorry, I encountered an error starting the session. Please refresh the page.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${api.defaults.baseURL}/ask-aria/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': api.defaults.headers.common['Authorization'] || '',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: messageToSend,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              if (data.startsWith('[ERROR]')) {
                throw new Error(data.slice(8));
              }

              accumulatedContent += data;
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? errorMessage : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await api.post('/ask-aria/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const documentId = uploadResponse.data.document_id;

      const classifyResponse = await api.post(`/ask-aria/classify/${documentId}`);

      const message = `I've uploaded and classified your document "${file.name}" as a ${classifyResponse.data.document_class} with ${(classifyResponse.data.confidence * 100).toFixed(0)}% confidence. How would you like to proceed?`;

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to upload document:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error uploading your document. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <h1 style={{ position: 'absolute', left: '-9999px' }}>Ask Aria</h1>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
        }}
      >
        <Avatar sx={{ bgcolor: '#1976d2' }}>
          <BotIcon />
        </Avatar>
        <Box>
          <Typography variant="h6">Ask Aria</Typography>
          <Typography variant="caption" color="text.secondary">
            Your intelligent ERP assistant
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip label="Online" color="success" size="small" />
      </Paper>

      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 1 && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              Quick Actions:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setInputMessage('Create a new sales quote')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                📝 Create a new sales quote
              </Button>
              <Button
                variant="outlined"
                onClick={() => setInputMessage('Show me recent invoices')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                📄 Show me recent invoices
              </Button>
              <Button
                variant="outlined"
                onClick={() => setInputMessage('Create a purchase order')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                🛒 Create a purchase order
              </Button>
              <Button
                variant="outlined"
                onClick={() => setInputMessage('Show customer list')}
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                👥 Show customer list
              </Button>
            </Box>
          </Box>
        )}
        {messages.map((message) => (
          <Box
            key={message.id}
            className="chat-message"
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 1,
            }}
          >
            {message.role === 'assistant' && (
              <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
                <BotIcon fontSize="small" />
              </Avatar>
            )}
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '70%',
                bgcolor: message.role === 'user' ? '#1976d2' : '#fff',
                color: message.role === 'user' ? '#fff' : 'text.primary',
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 1,
                  opacity: 0.7,
                }}
              >
                {new Date(message.created_at).toLocaleTimeString()}
              </Typography>
            </Paper>
            {message.role === 'user' && (
              <Avatar sx={{ bgcolor: '#757575', width: 32, height: 32 }}>
                <PersonIcon fontSize="small" />
              </Avatar>
            )}
          </Box>
        ))}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
              <BotIcon fontSize="small" />
            </Avatar>
            <Paper elevation={1} sx={{ p: 2 }}>
              <CircularProgress size={20} />
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          borderRadius: 0,
        }}
      >
        <input
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload">
          <IconButton component="span" disabled={loading}>
            <AttachFileIcon />
          </IconButton>
        </label>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type your message... (e.g., 'I need a quote for customer ABC')"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          variant="outlined"
          size="small"
        />
        <Button
          variant="contained"
          endIcon={<SendIcon />}
          onClick={sendMessage}
          disabled={!inputMessage.trim() || loading}
          sx={{ minWidth: 100 }}
        >
          Send
        </Button>
      </Paper>
    </Box>
  );
};

export default AskAriaChat;
