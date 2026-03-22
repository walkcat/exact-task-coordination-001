import React, { useMemo } from 'react';
import { Task, isDueSoon } from '@/types/task';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X, CheckCircle, Clock, AlertTriangle, ListTodo } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  '未开始': '#9e9e9e',
  '进行中': '#4a90d9',
  '已完成': '#28a745',
};

const PROF_COLORS = ['#4a90d9', '#28a745', '#f0ad4e', '#e83e8c', '#6f42c1', '#20c997'];

export default function TaskDashboard({ tasks, onClose }: DashboardProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === '已完成').length;
    const inProgress = tasks.filter(t => t.status === '进行中').length;
    const notStarted = tasks.filter(t => t.status === '未开始').length;
    const overdue = tasks.filter(t => isDueSoon(t)).length;
    return { total, completed, inProgress, notStarted, overdue };
  }, [tasks]);

  const statusData = useMemo(() => [
    { name: '未开始', value: stats.notStarted },
    { name: '进行中', value: stats.inProgress },
    { name: '已完成', value: stats.completed },
  ].filter(d => d.value > 0), [stats]);

  const profData = useMemo(() => {
    const map = new Map<string, { notStarted: number; inProgress: number; completed: number }>();
    tasks.forEach(t => {
      const prof = t.professional === '自定义' ? t.customProfessional || '自定义' : t.professional;
      if (!map.has(prof)) map.set(prof, { notStarted: 0, inProgress: 0, completed: 0 });
      const entry = map.get(prof)!;
      if (t.status === '已完成') entry.completed++;
      else if (t.status === '进行中') entry.inProgress++;
      else entry.notStarted++;
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      未开始: v.notStarted,
      进行中: v.inProgress,
      已完成: v.completed,
    }));
  }, [tasks]);

  const creatorData = useMemo(() => {
    const map = new Map<string, { notStarted: number; inProgress: number; completed: number; overdue: number }>();
    tasks.forEach(t => {
      const creator = t.creator || '未指定';
      if (!map.has(creator)) map.set(creator, { notStarted: 0, inProgress: 0, completed: 0, overdue: 0 });
      const entry = map.get(creator)!;
      if (t.status === '已完成') entry.completed++;
      else if (t.status === '进行中') entry.inProgress++;
      else entry.notStarted++;
      if (isDueSoon(t)) entry.overdue++;
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        已完成: v.completed,
        进行中: v.inProgress,
        未开始: v.notStarted,
        逾期: v.overdue,
      }))
      .sort((a, b) => (b.已完成 + b.进行中 + b.未开始) - (a.已完成 + a.进行中 + a.未开始))
      .slice(0, 10);
  }, [tasks]);

  const completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0';
  const overdueRate = stats.total > 0 ? ((stats.overdue / stats.total) * 100).toFixed(1) : '0';

  if (stats.total === 0) {
    return (
      <div className="dashboard-overlay">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>数据统计看板</h2>
            <button className="dashboard-close" onClick={onClose}><X size={18} /></button>
          </div>
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无任务数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>数据统计看板</h2>
          <button className="dashboard-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Summary Cards */}
        <div className="dashboard-cards">
          <div className="dash-card">
            <ListTodo size={20} className="dash-card-icon" style={{ color: '#4a90d9' }} />
            <div className="dash-card-info">
              <span className="dash-card-num">{stats.total}</span>
              <span className="dash-card-label">总任务数</span>
            </div>
          </div>
          <div className="dash-card">
            <CheckCircle size={20} className="dash-card-icon" style={{ color: '#28a745' }} />
            <div className="dash-card-info">
              <span className="dash-card-num" style={{ color: '#28a745' }}>{completionRate}%</span>
              <span className="dash-card-label">完成率</span>
            </div>
          </div>
          <div className="dash-card">
            <Clock size={20} className="dash-card-icon" style={{ color: '#4a90d9' }} />
            <div className="dash-card-info">
              <span className="dash-card-num" style={{ color: '#4a90d9' }}>{stats.inProgress}</span>
              <span className="dash-card-label">进行中</span>
            </div>
          </div>
          <div className="dash-card">
            <AlertTriangle size={20} className="dash-card-icon" style={{ color: '#dc3545' }} />
            <div className="dash-card-info">
              <span className="dash-card-num" style={{ color: '#dc3545' }}>{overdueRate}%</span>
              <span className="dash-card-label">逾期率</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="dashboard-charts">
          {/* Status Pie */}
          <div className="chart-box">
            <h3>任务状态分布</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#999'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Professional Bar */}
          <div className="chart-box">
            <h3>各专业任务统计</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={profData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="已完成" fill="#28a745" stackId="a" />
                <Bar dataKey="进行中" fill="#4a90d9" stackId="a" />
                <Bar dataKey="未开始" fill="#9e9e9e" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Creator Bar */}
          <div className="chart-box chart-box-full">
            <h3>各负责人任务统计</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={creatorData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="已完成" fill="#28a745" stackId="a" />
                <Bar dataKey="进行中" fill="#4a90d9" stackId="a" />
                <Bar dataKey="未开始" fill="#9e9e9e" stackId="a" />
                <Bar dataKey="逾期" fill="#dc3545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
