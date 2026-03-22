import React from 'react';
import { Task, isWarningTask, isDueSoon } from '@/types/task';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertTriangle, Clock, User, Users, Calendar, Flag, Star } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
}

function getDisplayProfessional(task: Task): string {
  return task.professional === '自定义' ? task.customProfessional || '自定义' : task.professional;
}

function getDisplaySource(task: Task): string {
  return task.taskSource === '自定义' ? task.customTaskSource || '自定义' : task.taskSource;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    '未开始': 'bg-gray-100 text-gray-700 border-gray-300',
    '进行中': 'bg-blue-50 text-blue-700 border-blue-300',
    '已完成': 'bg-green-50 text-green-700 border-green-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
      {status}
    </span>
  );
}

export default function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  const warning = isWarningTask(task);
  const overdue = isDueSoon(task);

  return (
    <Dialog open={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl task-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            任务详情
            {warning && !overdue && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock size={12} /> 即将到期
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle size={12} /> 已逾期
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">查看任务的完整信息</DialogDescription>
        </DialogHeader>

        <div className="task-detail-body">
          {/* 任务内容 */}
          <div className="detail-section">
            <h4 className="detail-section-title">任务内容</h4>
            <p className="detail-description">{task.description || '无'}</p>
          </div>

          {/* 任务进展 */}
          {task.comments && (
            <div className="detail-section">
              <h4 className="detail-section-title">任务进展</h4>
              <p className="detail-description">{task.comments}</p>
            </div>
          )}

          {/* 分类信息 */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">专业分类</span>
              <span className="detail-value">{getDisplayProfessional(task)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">事项来源</span>
              <span className="detail-value">{getDisplaySource(task)}</span>
            </div>
          </div>

          {/* 人员信息 */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label"><User size={12} className="inline mr-1" />负责人</span>
              <span className="detail-value">{task.creator || '未指定'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label"><Users size={12} className="inline mr-1" />协作人</span>
              <span className="detail-value">{task.collaborators || '无'}</span>
            </div>
          </div>

          {/* 日期信息 */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label"><Calendar size={12} className="inline mr-1" />开始日期</span>
              <span className="detail-value">{task.createDate || '未设置'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label"><Calendar size={12} className="inline mr-1" />完成日期</span>
              <span className={`detail-value ${overdue ? 'text-red-600 font-semibold' : ''}`}>{task.planDate || '未设置'}</span>
            </div>
          </div>

          {/* 状态信息 */}
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">完成状态</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="detail-item">
              <span className="detail-label"><Flag size={12} className="inline mr-1" />优先级</span>
              <span className="detail-value">{task.priority || '未设置'}</span>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label"><Star size={12} className="inline mr-1" />是否重要</span>
              <span className="detail-value">{task.isImportant || '未设置'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label"><Clock size={12} className="inline mr-1" />预警天数</span>
              <span className="detail-value">{task.warningDays}天</span>
            </div>
          </div>

          {/* 时间戳 */}
          <div className="detail-footer">
            <span>创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
            <span>更新时间：{new Date(task.updatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
