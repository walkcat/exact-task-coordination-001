import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectRoles, ROLE_LABELS } from '@/hooks/useProjectRoles';
import TaskForm from '@/components/TaskForm';
import TaskTable from '@/components/TaskTable';
import MobileKanban from '@/components/MobileKanban';
import TaskFilter, { FilterState, emptyFilter, applyFilter } from '@/components/TaskFilter';
import TaskDetailModal from '@/components/TaskDetailModal';
import ReportModal from '@/components/ReportModal';
import ProjectTabs from '@/components/ProjectTabs';
import TaskDashboard from '@/components/TaskDashboard';
import BulkImportModal from '@/components/BulkImportModal';
import RoleManageModal from '@/components/RoleManageModal';
import AccessLogModal from '@/components/AccessLogModal';
import AIAssistantModal from '@/components/AIAssistantModal';
import OnlineUsers from '@/components/OnlineUsers';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';
import { STATUSES } from '@/types/task';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ViewMode = 'professional' | 'taskSource' | 'creator';
type ReportType = 'weekly' | 'monthly';

const Index = () => {
  // Auth & theme hooks
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const isAdmin = user?.email === '17358716@qq.com';
  const projectsManager = useProjects();
  const manager = useTaskManager(projectsManager.activeProjectId);
  const roleManager = useProjectRoles(projectsManager.activeProjectId);
  const onlineUsers = useOnlinePresence();
  const [viewMode, setViewMode] = useState<ViewMode>('professional');
  const [formCollapsed, setFormCollapsed] = useState(isMobile);
  const [panelCollapsed, setPanelCollapsed] = useState(isMobile);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  
  // 获取当前用户在线列表中的显示名
  const myDisplayName = useMemo(() => {
    const me = onlineUsers.find(u => u.userId === user?.id);
    return me?.displayName || user?.email?.split('@')[0] || '';
  }, [onlineUsers, user?.id, user?.email]);

  const filteredTasks = useMemo(() => applyFilter(manager.tasks, filter), [manager.tasks, filter]);

  const creators = useMemo(() => {
    const set = new Set(manager.tasks.map(t => t.creator).filter(Boolean));
    return Array.from(set).sort();
  }, [manager.tasks]);

  const professionals = useMemo(() => {
    const set = new Set(manager.tasks.map(t =>
      t.professional === '自定义' ? t.customProfessional || '自定义' : t.professional
    ).filter(Boolean));
    return Array.from(set).sort();
  }, [manager.tasks]);

  const taskSources = useMemo(() => {
    const set = new Set(manager.tasks.map(t =>
      t.taskSource === '自定义' ? t.customTaskSource || '自定义' : t.taskSource
    ).filter(Boolean));
    return Array.from(set).sort();
  }, [manager.tasks]);

  const toggleView = useCallback(() => {
    setViewMode((prev) => {
      if (prev === 'professional') return 'taskSource';
      if (prev === 'taskSource') return 'creator';
      return 'professional';
    });
  }, []);

  const exportExcel = useCallback(() => {
    const getProf = (t: any) => t.professional === '自定义' ? t.customProfessional || '自定义' : t.professional;
    const getSrc = (t: any) => t.taskSource === '自定义' ? t.customTaskSource || '自定义' : t.taskSource;
    const data = manager.tasks.map((t) => ({
      '专业分类': getProf(t),
      '事项来源': getSrc(t),
      '任务内容': t.description,
      '任务进展': t.comments,
      '负责人': t.creator,
      '协作人': t.collaborators,
      '开始日期': t.createDate,
      '完成日期': t.planDate,
      '完成状态': t.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '任务列表');
    XLSX.writeFile(wb, '项目管理协调工具011_任务列表.xlsx');
  }, [manager.tasks]);

  const exportPDF = useCallback(async () => {
    if (!tableRef.current) return;
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = canvas.height * pdfW / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      pdf.save('项目管理协调工具011_任务列表.pdf');
    } catch (err) {
      alert('导出PDF失败，请稍后再试');
    }
  }, []);

  return (
    <div>
      <div className="app-header">
        <h1>{projectsManager.projects.find(p => p.id === projectsManager.activeProjectId)?.name ? `${projectsManager.projects.find(p => p.id === projectsManager.activeProjectId)?.name} - ` : ''}项目协调事项</h1>
        <div className="user-info">
          <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}>
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          {roleManager.myRole && (
            <span className="role-badge" style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 10,
              fontSize: 11, fontWeight: 600,
              background: roleManager.myRole === 'admin' ? '#dc354520' : roleManager.myRole === 'project_manager' ? '#4a90d920' : roleManager.myRole === 'member' ? '#28a74520' : '#9e9e9e20',
              color: roleManager.myRole === 'admin' ? '#dc3545' : roleManager.myRole === 'project_manager' ? '#4a90d9' : roleManager.myRole === 'member' ? '#28a745' : '#9e9e9e',
            }}>
              {ROLE_LABELS[roleManager.myRole]}
            </span>
          )}
          <span>{myDisplayName}</span>
          {roleManager.canManageRoles && (
            <button className="view-toggle-btn" onClick={() => setShowRoleManager(true)}>角色管理</button>
          )}
          {isAdmin && (
            <button className="view-toggle-btn" onClick={() => setShowAccessLog(true)}>访问记录</button>
          )}
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>退出登录</button>
        </div>
        <OnlineUsers users={onlineUsers} />
      </div>

      <ProjectTabs
        projects={projectsManager.projects}
        activeProjectId={projectsManager.activeProjectId}
        isAdmin={isAdmin}
        onSelect={projectsManager.setActiveProjectId}
        onAdd={projectsManager.addProject}
        onDelete={projectsManager.deleteProject}
        onRename={projectsManager.renameProject}
      />

      {!projectsManager.activeProjectId && projectsManager.projects.length === 0 && !projectsManager.loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>请先创建一个项目</p>
          <p>点击上方「新建项目」开始</p>
        </div>
      )}



      {projectsManager.activeProjectId && (
        <div className="main-layout">
          {/* Left Panel */}
          <div className={`left-panel ${panelCollapsed ? 'collapsed' : ''}`} id="leftPanel">
            {!roleManager.isGuest && (
              <>
                <div className="left-panel-header">
                  <h2>{manager.editingId ? '编辑任务' : '任务添加'}</h2>
                  <button
                    className={`toggle-form-btn ${formCollapsed ? 'collapsed' : ''}`}
                    id="toggleFormBtn"
                    aria-expanded={!formCollapsed}
                    aria-controls="formContentWrapper"
                    onClick={() => setFormCollapsed((prev) => !prev)}>
                    ▲
                  </button>
                </div>

                <div className={`form-content-wrapper ${formCollapsed ? 'collapsed' : ''}`} id="formContentWrapper">
                  <TaskForm
                    formData={manager.formData}
                    setFormData={manager.setFormData}
                    onSubmit={manager.handleSubmit}
                    editingId={manager.editingId}
                    onCancelEdit={manager.cancelEdit}
                    successMsg={manager.successMsg} />
                </div>
              </>
            )}

            {roleManager.isGuest && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>您当前为访客角色，只能查看任务</p>
              </div>
            )}

            <div className="action-buttons">
              <button className="weekly-report-btn" id="weeklyReportBtn" onClick={() => setReportType('weekly')}>周报</button>
              <button className="monthly-report-btn" id="monthlyReportBtn" onClick={() => setReportType('monthly')}>月报</button>
              <button className="export-btn" id="exportBtn" onClick={exportExcel}>导出Excel</button>
              <button className="export-pdf-btn" id="exportPdfBtn" onClick={exportPDF}>导出PDF</button>
              {!roleManager.isGuest && (
                <button className="export-btn" onClick={() => setShowBulkImport(true)}>批量导入</button>
              )}
              <button className="weekly-report-btn" onClick={() => setShowDashboard(true)}>统计看板</button>
              
            </div>
          </div>

          {/* Right Panel */}
          <div className={`right-panel ${panelCollapsed ? 'full-screen' : ''}`} id="rightPanel" ref={tableRef}>
            <div className="right-panel-header">
              <h2>任务列表{filteredTasks.length !== manager.tasks.length ? ` (${filteredTasks.length}/${manager.tasks.length})` : ''}</h2>
              <div className="header-controls">
                {!roleManager.isGuest && (
                  <button
                    className={`view-toggle-btn ${bulkMode ? 'bulk-active' : ''}`}
                    onClick={() => { setBulkMode(prev => !prev); setSelectedIds(new Set()); }}>
                    {bulkMode ? '退出批量' : '批量操作'}
                  </button>
                )}
                <button className="view-toggle-btn" id="viewToggleBtn" onClick={toggleView}>
                  视图切换：{viewMode === 'professional' ? '按专业分类' : viewMode === 'taskSource' ? '按事项来源' : '按负责人'}
                </button>
                <button
                  className="panel-toggle-btn"
                  id="panelToggleBtn"
                  aria-expanded={!panelCollapsed}
                  aria-controls="leftPanel"
                  onClick={() => setPanelCollapsed((prev) => !prev)}>
                  <span className={`icon ${panelCollapsed ? 'rotated' : ''}`}>◀</span>
                </button>
              </div>
            </div>

            <TaskFilter filter={filter} onChange={setFilter} creators={creators} professionals={professionals} taskSources={taskSources} />

            {bulkMode && selectedIds.size > 0 && !roleManager.isGuest && (
              <div className="bulk-action-bar">
                <span>已选 {selectedIds.size} 项</span>
                <select
                  defaultValue=""
                  onChange={async (e) => {
                    const status = e.target.value;
                    if (!status) return;
                    const ok = await manager.bulkUpdateStatus(Array.from(selectedIds), status);
                    if (ok) { setSelectedIds(new Set()); }
                    e.target.value = '';
                  }}>
                  <option value="" disabled>批量改状态</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {roleManager.canDeleteTasks && (
                  <button
                    className="bulk-delete-btn"
                    onClick={async () => {
                      const ok = await manager.bulkDeleteTasks(Array.from(selectedIds));
                      if (ok) { setSelectedIds(new Set()); }
                    }}>
                    批量删除
                  </button>
                )}
              </div>
            )}

            {isMobile ? (
              <MobileKanban
                tasks={filteredTasks}
                viewMode={viewMode}
                onEdit={roleManager.canEditTasks ? (task) => {
                  setPanelCollapsed(false);
                  setFormCollapsed(false);
                  manager.startEdit(task);
                } : undefined}
                onDelete={roleManager.canDeleteTasks ? manager.deleteTask : undefined}
                onRowClick={bulkMode ? undefined : setDetailTask}
                selectedIds={bulkMode && !roleManager.isGuest ? selectedIds : undefined}
                onSelectionChange={bulkMode && !roleManager.isGuest ? setSelectedIds : undefined}
              />
            ) : (
              <TaskTable
                tasks={filteredTasks}
                viewMode={viewMode}
                isFullScreen={panelCollapsed}
                onEdit={roleManager.canEditTasks ? (task) => {
                  setPanelCollapsed(false);
                  setFormCollapsed(false);
                  manager.startEdit(task);
                } : undefined}
                onDelete={roleManager.canDeleteTasks ? manager.deleteTask : undefined}
                onRowClick={bulkMode ? undefined : setDetailTask}
                selectedIds={bulkMode && !roleManager.isGuest ? selectedIds : undefined}
                onSelectionChange={bulkMode && !roleManager.isGuest ? setSelectedIds : undefined}
              />
            )}
          </div>
        </div>
      )}

      {reportType &&
        <ReportModal
          type={reportType}
          tasks={manager.tasks}
          onClose={() => setReportType(null)} />
      }

      {showBulkImport &&
        <BulkImportModal
          onImport={manager.bulkImport}
          onClose={() => setShowBulkImport(false)} />
      }

      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />

      {showDashboard && (
        <TaskDashboard tasks={manager.tasks} onClose={() => setShowDashboard(false)} />
      )}

      {showRoleManager && (
        <RoleManageModal
          roles={roleManager.roles}
          onAssign={roleManager.assignRole}
          onRemove={roleManager.removeRole}
          onClose={() => setShowRoleManager(false)}
          isGlobalAdmin={roleManager.isGlobalAdmin}
        />
      )}

      <AccessLogModal open={showAccessLog} onClose={() => setShowAccessLog(false)} />

      {/* Floating AI Assistant Tab */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed bottom-6 right-0 z-40 px-2 py-3 rounded-l-lg text-white border border-r-0 border-[#4a90d9]/30 shadow-md hover:shadow-lg hover:pr-4 transition-all duration-200 flex items-center gap-1 text-xs"
        style={{ background: 'linear-gradient(135deg, #7bb3e0, #4a90d9)', writingMode: 'vertical-rl' }}
        title="AI 助手"
      >
        🤖 AI
      </button>

      <AIAssistantModal
        open={showAI}
        onClose={() => setShowAI(false)}
        tasks={manager.tasks}
        onApplyClassification={(cls) => {
          manager.setFormData(prev => ({
            ...prev,
            professional: cls.professional,
            taskSource: cls.taskSource,
            priority: cls.priority,
            isImportant: cls.isImportant,
          }));
        }}
      />

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要退出登录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>确认退出</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
