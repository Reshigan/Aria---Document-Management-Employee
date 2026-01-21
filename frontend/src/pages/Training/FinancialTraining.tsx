import React, { useState } from 'react';
import { Play, Clock, CheckCircle, BookOpen, Award, Users } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  modules: number;
  completedModules: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  enrolled: boolean;
}

const FinancialTraining: React.FC = () => {
  const [courses] = useState<Course[]>([
    {
      id: '1',
      title: 'General Ledger Fundamentals',
      description: 'Learn the basics of chart of accounts, journal entries, and financial reporting.',
      duration: '2 hours',
      modules: 8,
      completedModules: 0,
      level: 'Beginner',
      enrolled: false
    },
    {
      id: '2',
      title: 'Budget Management Mastery',
      description: 'Create effective budgets, track variances, and improve financial planning.',
      duration: '1.5 hours',
      modules: 6,
      completedModules: 0,
      level: 'Intermediate',
      enrolled: false
    },
    {
      id: '3',
      title: 'Accounts Payable Best Practices',
      description: 'Streamline AP processes, manage payment batches, and handle expense claims.',
      duration: '2.5 hours',
      modules: 10,
      completedModules: 0,
      level: 'Intermediate',
      enrolled: false
    },
    {
      id: '4',
      title: 'Accounts Receivable Excellence',
      description: 'Optimize AR workflows, manage collections, and reduce DSO.',
      duration: '2 hours',
      modules: 8,
      completedModules: 0,
      level: 'Intermediate',
      enrolled: false
    },
    {
      id: '5',
      title: 'Bank Reconciliation Workshop',
      description: 'Master the art of reconciling bank statements quickly and accurately.',
      duration: '1 hour',
      modules: 4,
      completedModules: 0,
      level: 'Beginner',
      enrolled: false
    },
    {
      id: '6',
      title: 'Month-End Close Procedures',
      description: 'Complete guide to closing your books efficiently and accurately.',
      duration: '3 hours',
      modules: 12,
      completedModules: 0,
      level: 'Advanced',
      enrolled: false
    }
  ]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return { bg: '#dcfce7', text: '#166534' };
      case 'Intermediate': return { bg: '#fef3c7', text: '#92400e' };
      case 'Advanced': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Financial Training</h1>
        <p style={{ color: '#6b7280' }}>Master financial management with our comprehensive training courses</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={24} style={{ color: '#3b82f6' }} />
            <div>
              <p style={{ fontSize: '24px', fontWeight: 600 }}>{courses.length}</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Total Courses</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={24} style={{ color: '#10b981' }} />
            <div>
              <p style={{ fontSize: '24px', fontWeight: 600 }}>12h</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Total Duration</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={24} style={{ color: '#8b5cf6' }} />
            <div>
              <p style={{ fontSize: '24px', fontWeight: 600 }}>0</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Completed</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={24} style={{ color: '#f59e0b' }} />
            <div>
              <p style={{ fontSize: '24px', fontWeight: 600 }}>0</p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>Certificates</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {courses.map(course => {
          const levelColor = getLevelColor(course.level);
          return (
            <div
              key={course.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ height: '120px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={48} style={{ color: 'white' }} />
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: levelColor.bg,
                    color: levelColor.text
                  }}>
                    {course.level}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {course.duration}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{course.title}</h3>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>{course.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>
                    {course.modules} modules
                  </span>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Start Course
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Users size={32} style={{ color: '#3b82f6' }} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Need Live Training?</h3>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Contact your administrator to schedule instructor-led training sessions for your team.</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialTraining;
