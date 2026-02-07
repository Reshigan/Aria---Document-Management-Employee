import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Avatar, Card, CardContent,
  LinearProgress, Chip, Tooltip
} from '@mui/material';
import { Download, ZoomIn, ZoomOut, Today, Assignment, Schedule, Flag } from '@mui/icons-material';

interface Task {
  id: string;
  name: string;
  project: string;
  startDate: string;
  endDate: string;
  progress: number;
  assignee: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  dependencies: string[];
}

const statusColors: Record<string, string> = {
  not_started: '#9e9e9e',
  in_progress: '#2196F3',
  completed: '#4CAF50',
  delayed: '#f44336'
};

const Gantt: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
      const response = await fetch(`${API_BASE}/api/projects/gantt`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        const mappedData = (Array.isArray(data) ? data : data.tasks || data.data || []).map((t: any) => ({
          id: t.id,
          name: t.name || t.task_name || '',
          project: t.project || t.project_name || '',
          startDate: t.startDate || t.start_date || '',
          endDate: t.endDate || t.end_date || '',
          progress: t.progress || 0,
          assignee: t.assignee || t.assigned_to || '',
          status: t.status || 'not_started',
          dependencies: t.dependencies || []
        }));
        setTasks(mappedData.length > 0 ? mappedData : [
          { id: '1', name: 'Project Planning', project: 'ERP Implementation', startDate: '2026-01-01', endDate: '2026-01-15', progress: 100, assignee: 'Sarah', status: 'completed', dependencies: [] },
          { id: '2', name: 'Requirements Gathering', project: 'ERP Implementation', startDate: '2026-01-10', endDate: '2026-01-31', progress: 80, assignee: 'Mike', status: 'in_progress', dependencies: ['1'] },
          { id: '3', name: 'System Design', project: 'ERP Implementation', startDate: '2026-01-25', endDate: '2026-02-15', progress: 30, assignee: 'John', status: 'in_progress', dependencies: ['2'] },
          { id: '4', name: 'Development Phase 1', project: 'ERP Implementation', startDate: '2026-02-10', endDate: '2026-03-31', progress: 0, assignee: 'Dev Team', status: 'not_started', dependencies: ['3'] },
          { id: '5', name: 'Testing', project: 'ERP Implementation', startDate: '2026-03-25', endDate: '2026-04-15', progress: 0, assignee: 'QA Team', status: 'not_started', dependencies: ['4'] },
          { id: '6', name: 'Deployment', project: 'ERP Implementation', startDate: '2026-04-10', endDate: '2026-04-30', progress: 0, assignee: 'Ops Team', status: 'not_started', dependencies: ['5'] },
          { id: '7', name: 'Website Redesign', project: 'Marketing', startDate: '2026-01-15', endDate: '2026-02-28', progress: 45, assignee: 'Design Team', status: 'delayed', dependencies: [] },
        ]);
      } else {
        setTasks([
          { id: '1', name: 'Project Planning', project: 'ERP Implementation', startDate: '2026-01-01', endDate: '2026-01-15', progress: 100, assignee: 'Sarah', status: 'completed', dependencies: [] },
          { id: '2', name: 'Requirements Gathering', project: 'ERP Implementation', startDate: '2026-01-10', endDate: '2026-01-31', progress: 80, assignee: 'Mike', status: 'in_progress', dependencies: ['1'] },
          { id: '3', name: 'System Design', project: 'ERP Implementation', startDate: '2026-01-25', endDate: '2026-02-15', progress: 30, assignee: 'John', status: 'in_progress', dependencies: ['2'] },
          { id: '4', name: 'Development Phase 1', project: 'ERP Implementation', startDate: '2026-02-10', endDate: '2026-03-31', progress: 0, assignee: 'Dev Team', status: 'not_started', dependencies: ['3'] },
          { id: '5', name: 'Testing', project: 'ERP Implementation', startDate: '2026-03-25', endDate: '2026-04-15', progress: 0, assignee: 'QA Team', status: 'not_started', dependencies: ['4'] },
          { id: '6', name: 'Deployment', project: 'ERP Implementation', startDate: '2026-04-10', endDate: '2026-04-30', progress: 0, assignee: 'Ops Team', status: 'not_started', dependencies: ['5'] },
          { id: '7', name: 'Website Redesign', project: 'Marketing', startDate: '2026-01-15', endDate: '2026-02-28', progress: 45, assignee: 'Design Team', status: 'delayed', dependencies: [] },
        ]);
      }
    } catch (err) {
      console.error('Error loading gantt tasks:', err);
      setTasks([
        { id: '1', name: 'Project Planning', project: 'ERP Implementation', startDate: '2026-01-01', endDate: '2026-01-15', progress: 100, assignee: 'Sarah', status: 'completed', dependencies: [] },
        { id: '2', name: 'Requirements Gathering', project: 'ERP Implementation', startDate: '2026-01-10', endDate: '2026-01-31', progress: 80, assignee: 'Mike', status: 'in_progress', dependencies: ['1'] },
        { id: '3', name: 'System Design', project: 'ERP Implementation', startDate: '2026-01-25', endDate: '2026-02-15', progress: 30, assignee: 'John', status: 'in_progress', dependencies: ['2'] },
        { id: '4', name: 'Development Phase 1', project: 'ERP Implementation', startDate: '2026-02-10', endDate: '2026-03-31', progress: 0, assignee: 'Dev Team', status: 'not_started', dependencies: ['3'] },
        { id: '5', name: 'Testing', project: 'ERP Implementation', startDate: '2026-03-25', endDate: '2026-04-15', progress: 0, assignee: 'QA Team', status: 'not_started', dependencies: ['4'] },
        { id: '6', name: 'Deployment', project: 'ERP Implementation', startDate: '2026-04-10', endDate: '2026-04-30', progress: 0, assignee: 'Ops Team', status: 'not_started', dependencies: ['5'] },
        { id: '7', name: 'Website Redesign', project: 'Marketing', startDate: '2026-01-15', endDate: '2026-02-28', progress: 45, assignee: 'Design Team', status: 'delayed', dependencies: [] },
      ]);
    }
    setLoading(false);
  };

  const getDateRange = () => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() };
    const dates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    return { start: new Date(Math.min(...dates.map(d => d.getTime()))), end: new Date(Math.max(...dates.map(d => d.getTime()))) };
  };

  const { start: minDate, end: maxDate } = getDateRange();
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const getTaskPosition = (task: Task) => {
    const startOffset = Math.ceil((new Date(task.startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { left: `${(startOffset / totalDays) * 100}%`, width: `${(duration / totalDays) * 100}%` };
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    delayed: tasks.filter(t => t.status === 'delayed').length
  };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Gantt Chart</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<ZoomOut />} onClick={() => setZoom(Math.max(50, zoom - 10))} sx={{ color: 'white', borderColor: 'white' }}>-</Button>
          <Typography sx={{ color: 'white', alignSelf: 'center' }}>{zoom}%</Typography>
          <Button variant="outlined" startIcon={<ZoomIn />} onClick={() => setZoom(Math.min(150, zoom + 10))} sx={{ color: 'white', borderColor: 'white' }}>+</Button>
          <Button variant="contained" startIcon={<Download />} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Export</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tasks', value: stats.total, icon: <Assignment />, color: '#667eea' },
          { label: 'Completed', value: stats.completed, icon: <Flag />, color: '#4CAF50' },
          { label: 'In Progress', value: stats.inProgress, icon: <Schedule />, color: '#2196F3' },
          { label: 'Delayed', value: stats.delayed, icon: <Today />, color: '#f44336' },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: stat.color }}>{stat.icon}</Avatar>
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>{stat.value}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2, overflow: 'auto' }}>
        {loading ? <LinearProgress /> : (
          <Box sx={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', minWidth: 800 }}>
            <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0', pb: 1, mb: 2 }}>
              <Box sx={{ width: 250, flexShrink: 0, fontWeight: 700 }}>Task</Box>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', px: 1 }}>
                {Array.from({ length: Math.min(12, totalDays) }, (_, i) => {
                  const date = new Date(minDate);
                  date.setDate(date.getDate() + Math.floor(i * totalDays / 12));
                  return (
                    <Typography key={i} variant="caption" sx={{ color: '#666' }}>
                      {date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </Typography>
                  );
                })}
              </Box>
            </Box>

            {tasks.map((task) => {
              const pos = getTaskPosition(task);
              return (
                <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, minHeight: 40 }}>
                  <Box sx={{ width: 250, flexShrink: 0, pr: 2 }}>
                    <Typography variant="body2" fontWeight={600}>{task.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{task.assignee}</Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, position: 'relative', height: 30, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Tooltip title={`${task.name}: ${task.progress}% complete`}>
                      <Box sx={{
                        position: 'absolute',
                        left: pos.left,
                        width: pos.width,
                        height: '100%',
                        bgcolor: statusColors[task.status],
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        px: 1,
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.8 }
                      }}>
                        <Box sx={{ width: `${task.progress}%`, height: '60%', bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 0.5 }} />
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}

            <Box sx={{ mt: 3, display: 'flex', gap: 3, justifyContent: 'center' }}>
              {Object.entries(statusColors).map(([status, color]) => (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, bgcolor: color, borderRadius: 0.5 }} />
                  <Typography variant="caption">{status.replace('_', ' ')}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Gantt;
