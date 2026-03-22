export interface Task {
  id: string;
  professional: string;
  customProfessional: string;
  taskSource: string;
  customTaskSource: string;
  description: string;
  comments: string;
  creator: string;
  collaborators: string;
  createDate: string;
  planDate: string;
  isImportant: string;
  warningDays: number;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const PROFESSIONALS = ['建筑', '结构', '机电', '景观', '精装', '自定义'];
export const TASK_SOURCES = ['设计管理', '招标管理', '合同管理', '配套管理', '施工管理', '变更管理', '自定义'];
export const STATUSES = ['未开始', '进行中', '已完成'];
export const PRIORITIES = ['', '高', '中', '低'];
export const IMPORTANT_OPTIONS = ['', '是', '否'];

export function getToday(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function createEmptyTask(): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    professional: '建筑',
    customProfessional: '',
    taskSource: '设计管理',
    customTaskSource: '',
    description: '',
    comments: '',
    creator: '',
    collaborators: '',
    createDate: getToday(),
    planDate: '',
    isImportant: '',
    warningDays: 7,
    priority: '',
    status: '未开始',
  };
}

export function isWarningTask(task: Task): boolean {
  if (!task.planDate || task.status === '已完成') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const plan = new Date(task.planDate);
  plan.setHours(0, 0, 0, 0);
  const diffDays = (plan.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= task.warningDays;
}

export function isDueSoon(task: Task): boolean {
  if (!task.planDate || task.status === '已完成') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const plan = new Date(task.planDate);
  plan.setHours(0, 0, 0, 0);
  return plan.getTime() < now.getTime();
}
