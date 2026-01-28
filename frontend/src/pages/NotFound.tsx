import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Home, ArrowBack, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: 3,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 4,
          borderRadius: 3,
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            mb: 4,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '6rem', sm: '8rem' },
              fontWeight: 800,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
            }}
          >
            404
          </Typography>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              zIndex: -1,
            }}
          />
        </Box>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#1a1a2e',
            mb: 2,
          }}
        >
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: '#666',
            mb: 4,
            lineHeight: 1.6,
            maxWidth: 400,
            mx: 'auto',
          }}
        >
          The page you're looking for doesn't exist or has been moved.
          Please check the URL or navigate back to the dashboard.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => navigate('/dashboard')}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd6',
                background: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            Go Back
          </Button>
        </Box>

        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: '1px solid #eee',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: '#999', mb: 2 }}
          >
            Looking for something specific?
          </Typography>
          <Button
            variant="text"
            startIcon={<Search />}
            onClick={() => {
              // Trigger command palette if available
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                bubbles: true,
              });
              document.dispatchEvent(event);
            }}
            sx={{
              color: '#667eea',
              '&:hover': {
                background: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            Search with Ctrl+K
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
