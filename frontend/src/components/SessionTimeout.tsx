import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import { Timer, Logout, Refresh } from '@mui/icons-material';
import { clearTokens, getAccessToken } from '../utils/auth';

interface SessionTimeoutProps {
  // Time in milliseconds before showing warning (default: 25 minutes)
  warningTime?: number;
  // Time in milliseconds before auto-logout after warning (default: 5 minutes)
  timeoutTime?: number;
  // Callback when session is extended
  onExtend?: () => void;
  // Callback when user is logged out
  onLogout?: () => void;
}

export function SessionTimeout({
  warningTime = 25 * 60 * 1000, // 25 minutes
  timeoutTime = 5 * 60 * 1000, // 5 minutes
  onExtend,
  onLogout,
}: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(timeoutTime / 1000);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(() => {
    clearTokens();
    setShowWarning(false);
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/login';
    }
  }, [onLogout]);

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // Only set timers if user is authenticated
    if (!getAccessToken()) return;

    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setCountdown(timeoutTime / 1000);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(timeoutTime / 1000);

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningTime);
  }, [warningTime, timeoutTime, handleLogout]);

  const handleExtendSession = useCallback(() => {
    resetTimers();
    if (onExtend) {
      onExtend();
    }
  }, [resetTimers, onExtend]);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      // Only reset if not showing warning and enough time has passed since last reset
      if (!showWarning && Date.now() - lastActivityRef.current > 1000) {
        resetTimers();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [resetTimers, showWarning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (countdown / (timeoutTime / 1000)) * 100;

  return (
    <Dialog
      open={showWarning}
      onClose={() => {}} // Prevent closing by clicking outside
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
          py: 2,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Timer sx={{ color: 'white', fontSize: 28 }} />
          <DialogTitle
            sx={{
              p: 0,
              color: 'white',
              fontWeight: 600,
            }}
          >
            Session Expiring Soon
          </DialogTitle>
        </Box>
      </Box>

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body1" sx={{ mb: 3, color: '#666' }}>
          Your session is about to expire due to inactivity. You will be automatically
          logged out in:
        </Typography>

        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            px: 2,
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.1) 100%)',
            borderRadius: 2,
            mb: 3,
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              color: countdown <= 60 ? '#d32f2f' : '#f57c00',
              fontFamily: 'monospace',
            }}
          >
            {formatTime(countdown)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
            {countdown <= 60 ? 'Less than a minute remaining!' : 'minutes remaining'}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255, 152, 0, 0.2)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              background: countdown <= 60
                ? 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)'
                : 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
            },
          }}
        />

        <Typography variant="body2" sx={{ mt: 2, color: '#999', textAlign: 'center' }}>
          Click "Stay Logged In" to continue your session
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<Logout />}
          onClick={handleLogout}
          sx={{
            borderColor: '#d32f2f',
            color: '#d32f2f',
            '&:hover': {
              borderColor: '#c62828',
              background: 'rgba(211, 47, 47, 0.1)',
            },
          }}
        >
          Log Out Now
        </Button>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleExtendSession}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
            },
          }}
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SessionTimeout;
