import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import {
  Inbox,
  Search,
  Add,
  FilterList,
  CloudOff,
  ErrorOutline,
  Assignment,
  People,
  ShoppingCart,
  Receipt,
  Inventory,
  Work,
} from '@mui/icons-material';

type EmptyStateType =
  | 'no-data'
  | 'no-results'
  | 'no-filter-results'
  | 'error'
  | 'offline'
  | 'custom';

type IconType =
  | 'inbox'
  | 'search'
  | 'filter'
  | 'error'
  | 'offline'
  | 'tasks'
  | 'people'
  | 'orders'
  | 'invoices'
  | 'inventory'
  | 'work';

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: IconType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

const iconMap: Record<IconType, React.ElementType> = {
  inbox: Inbox,
  search: Search,
  filter: FilterList,
  error: ErrorOutline,
  offline: CloudOff,
  tasks: Assignment,
  people: People,
  orders: ShoppingCart,
  invoices: Receipt,
  inventory: Inventory,
  work: Work,
};

const defaultContent: Record<EmptyStateType, { icon: IconType; title: string; description: string }> = {
  'no-data': {
    icon: 'inbox',
    title: 'No data yet',
    description: 'Get started by creating your first item.',
  },
  'no-results': {
    icon: 'search',
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
  },
  'no-filter-results': {
    icon: 'filter',
    title: 'No matching results',
    description: 'No items match your current filters. Try adjusting or clearing your filters.',
  },
  error: {
    icon: 'error',
    title: 'Something went wrong',
    description: 'We encountered an error loading this data. Please try again.',
  },
  offline: {
    icon: 'offline',
    title: 'You\'re offline',
    description: 'Please check your internet connection and try again.',
  },
  custom: {
    icon: 'inbox',
    title: 'No items',
    description: 'There are no items to display.',
  },
};

export function EmptyState({
  type = 'no-data',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}: EmptyStateProps) {
  const defaults = defaultContent[type];
  const IconComponent = iconMap[icon || defaults.icon];
  const displayTitle = title || defaults.title;
  const displayDescription = description || defaults.description;

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <IconComponent sx={{ fontSize: 24, color: '#667eea' }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}>
          {displayTitle}
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          {displayDescription}
        </Typography>
        {actionLabel && onAction && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={onAction}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)',
        border: '1px dashed rgba(102, 126, 234, 0.3)',
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <IconComponent sx={{ fontSize: 40, color: '#667eea' }} />
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          color: '#333',
          mb: 1,
        }}
      >
        {displayTitle}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: '#666',
          maxWidth: 400,
          mb: 3,
          lineHeight: 1.6,
        }}
      >
        {displayDescription}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAction}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="outlined"
            onClick={onSecondaryAction}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd6',
                background: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

export default EmptyState;
