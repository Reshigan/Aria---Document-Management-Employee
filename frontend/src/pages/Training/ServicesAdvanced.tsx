import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, Card, CardContent, Avatar, Button, LinearProgress, Chip, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { School, CheckCircle, PlayArrow, Timer, Assignment, Lock } from '@mui/icons-material';

interface Module { id: string; title: string; duration: string; completed: boolean; locked: boolean; }

const ServicesAdvanced: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    { id: '1', title: 'Advanced SLA Management', duration: '40 min', completed: false, locked: false },
    { id: '2', title: 'Escalation Handling', duration: '35 min', completed: false, locked: true },
    { id: '3', title: 'Service Contract Management', duration: '40 min', completed: false, locked: true },
    { id: '4', title: 'Customer Success Strategies', duration: '35 min', completed: false, locked: true },
    { id: '5', title: 'Service Analytics', duration: '30 min', completed: false, locked: true },
    { id: '6', title: 'Advanced Assessment', duration: '45 min', completed: false, locked: true },
  ]);

  const completedCount = modules.filter(m => m.completed).length;
  const progress = (completedCount / modules.length) * 100;

  const handleStartModule = (id: string) => { setModules(modules.map((m, i) => { if (m.id === id) return { ...m, completed: true }; if (modules[i - 1]?.id === id) return { ...m, locked: false }; return m; })); };

  return (
    <Box sx={{ p: 3, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>Advanced Services Training</Typography>
        <Chip label="Advanced" color="warning" />
      </Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[{ label: 'Total Modules', value: modules.length, icon: <School />, color: '#667eea' }, { label: 'Completed', value: completedCount, icon: <CheckCircle />, color: '#4CAF50' }, { label: 'Progress', value: `${Math.round(progress)}%`, icon: <Assignment />, color: '#FF9800' }, { label: 'Est. Time', value: '3.75 hrs', icon: <Timer />, color: '#E91E63' }].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}><Card sx={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}><CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Avatar sx={{ bgcolor: stat.color }}>{stat.icon}</Avatar><Box><Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>{stat.value}</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>{stat.label}</Typography></Box></CardContent></Card></Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2, mb: 3 }}><Typography variant="h6" gutterBottom>Course Progress</Typography><LinearProgress variant="determinate" value={progress} sx={{ height: 10, borderRadius: 5, mb: 1 }} /><Typography variant="body2" color="text.secondary">{completedCount} of {modules.length} modules completed</Typography></Paper>
      <Paper sx={{ p: 3, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }}><Typography variant="h6" gutterBottom>Course Modules</Typography><List>{modules.map((module, index) => (<ListItem key={module.id} sx={{ bgcolor: index % 2 === 0 ? '#f5f5f5' : 'white', borderRadius: 1, mb: 1 }}><ListItemIcon>{module.completed ? <CheckCircle color="success" /> : module.locked ? <Lock color="disabled" /> : <PlayArrow color="primary" />}</ListItemIcon><ListItemText primary={<Typography fontWeight={600}>{module.title}</Typography>} secondary={`Duration: ${module.duration}`} />{!module.completed && !module.locked && (<Button variant="contained" size="small" onClick={() => handleStartModule(module.id)} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>Start</Button>)}{module.completed && <Chip label="Completed" color="success" size="small" />}{module.locked && <Chip label="Locked" size="small" />}</ListItem>))}</List></Paper>
    </Box>
  );
};

export default ServicesAdvanced;
