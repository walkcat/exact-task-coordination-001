import React, { useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Task } from '@/types/task';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AIAssistantModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  onApplyClassification?: (classification: {
    professional: string;
    taskSource: string;
    priority: string;
    isImportant: string;
  }) => void;
  classifyContext?: {
    description: string;
    creator: string;
    comments: string;
  } | null;
}

type AIAction = 'classify' | 'report' | 'suggest' | 'summary' | 'risk' | 'predict' | 'chat';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = 'https://deepseek-gateway.zeabur.app/api/chat';

export default function AIAssistantModal({ open, onClose, tasks, onApplyClassification, classifyContext }: AIAssistantModalProps) {
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [classifyResult, setClassifyResult] = useState<any>(null);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [classifyDesc, setClassifyDesc] = useState('');
  const [classifyCreator, setClassifyCreator] = useState('');
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const reset = useCallback(() => {
    setActiveAction(null);
    setStreamContent('');
    setClassifyResult(null);
    setError('');
    setLoading(false);
    setChatMessages([]);
    setChatInput('');
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const taskPayload = useCallback(() => tasks.map(t => ({
    professional: t.professional === '自定义' ? t.customProfessional || '自定义' : t.professional,
    taskSource: t.taskSource === '自定义' ? t.customTaskSource || '自定义' : t.taskSource,
    description: t.description,
    status: t.status,
    creator: t.creator,
    planDate: t.planDate,
    createDate: t.createDate,
    comments: t.comments,
    priority: t.priority,
    isImportant: t.isImportant,
  })), [tasks]);

  // Classify
  const handleClassify = useCallback(async () => {
    const desc = classifyContext?.description || classifyDesc;
    if (!desc.trim()) { setError('请输入任务描述'); return; }
    setLoading(true); setError(''); setClassifyResult(null);
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'classify', 
          context: { 
            description: desc, 
            creator: classifyContext?.creator || classifyCreator, 
            comments: classifyContext?.comments || '' 
          } 
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${resp.status})`);
      }
      const data = await resp.json();
      if (data?.error) throw new Error(data.error);
      setClassifyResult(data.result);
    } catch (e: any) { setError(e.message || 'AI分类失败'); }
    finally { setLoading(false); }
  }, [classifyContext, classifyDesc, classifyCreator]);

  // Generic stream handler
  const handleStream = useCallback(async (action: string, extraBody: Record<string, any> = {}) => {
    setLoading(true); setError(''); setStreamContent('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tasks: taskPayload(), ...extraBody }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${resp.status})`);
      }
      if (!resp.body) throw new Error('No response body');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { content += delta; setStreamContent(content); }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message || 'AI请求失败');
    } finally { setLoading(false); abortRef.current = null; }
  }, [taskPayload]);

// Chat handler - 修复版本
const handleChat = useCallback(async () => {
  if (!chatInput.trim() || loading) return;
  const userMsg: ChatMessage = { role: 'user', content: chatInput };
  const newMessages = [...chatMessages, userMsg];
  setChatMessages(newMessages);
  setChatInput('');
  setLoading(true); 
  setError('');

  const controller = new AbortController();
  abortRef.current = controller;

  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', tasks: taskPayload(), messages: newMessages }),
      signal: controller.signal,
    });
    
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `请求失败 (${resp.status})`);
    }

    // 检查是否是流响应
    const contentType = resp.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      // SSE 流处理
      if (!resp.body) throw new Error('No response body');
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } else {
      // 普通 JSON 响应处理
      const data = await resp.json();
      const assistantContent = data.choices?.[0]?.message?.content || '';
      
      if (!assistantContent) {
        throw new Error('AI 未返回有效内容');
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    }

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      setError(e.message || 'AI请求失败');
    }
  } finally { 
    setLoading(false); 
    abortRef.current = null; 
  }
}, [chatInput, chatMessages, loading, taskPayload]);


  const ACTION_LIST: { key: AIAction; icon: string; title: string; desc: string }[] = [
    { key: 'chat', icon: '💬', title: 'AI 对话问答', desc: '自由对话，询问项目相关问题' },
    { key: 'summary', icon: '📝', title: '项目智能摘要', desc: '一键生成项目状态摘要' },
    { key: 'risk', icon: '⚠️', title: '进度风险预警', desc: '全面分析项目风险和瓶颈' },
    { key: 'predict', icon: '📅', title: '工期预测', desc: '预测项目完成时间' },
    { key: 'classify', icon: '🏷️', title: '任务智能分类', desc: '自动推荐专业分类、来源、优先级' },
    { key: 'report', icon: '📊', title: 'AI 周报/月报', desc: '基于任务数据生成专业报告' },
    { key: 'suggest', icon: '💡', title: '智能任务建议', desc: '发现遗漏工作和优化机会' },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="w-[520px] sm:w-[600px] max-w-[90vw] flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>🤖</span>
            <span>AI 智能助手</span>
            {activeAction && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                基于 {tasks.length} 条任务数据
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Action selector */}
        {!activeAction && (
          <div className="flex flex-col gap-2 mt-4 overflow-y-auto">
            {ACTION_LIST.map(a => (
              <button key={a.key} className="ai-action-btn" onClick={() => setActiveAction(a.key)}>
                <span className="ai-action-icon">{a.icon}</span>
                <div className="ai-action-text">
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Chat panel */}
        {activeAction === 'chat' && (
          <div className="flex flex-col gap-2 mt-4 flex-1 overflow-hidden">
            <button className="ai-back-btn" onClick={reset}>← 返回</button>
            <h3 className="text-base font-semibold" style={{ color: 'var(--primary-color)' }}>💬 AI 对话问答</h3>
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
              {chatMessages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <p>👋 你好！我是你的项目管理AI助手。</p>
                  <p className="mt-1">你可以问我关于项目进度、任务安排、工程技术等问题。</p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {['当前项目整体进度如何？', '哪些任务存在延期风险？', '本周重点工作有哪些？'].map(q => (
                      <button key={q} className="ai-quick-btn" onClick={() => { setChatInput(q); }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`ai-chat-msg ${msg.role}`}>
                  <div className="ai-chat-bubble">
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <input
                className="ai-input flex-1"
                placeholder="输入你的问题..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChat()}
                disabled={loading}
              />
              <button className="ai-submit-btn !w-auto !px-4" onClick={handleChat} disabled={loading || !chatInput.trim()}>
                {loading ? '...' : '发送'}
              </button>
            </div>
          </div>
        )}

        {/* Classify panel */}
        {activeAction === 'classify' && (
          <div className="flex flex-col gap-3 mt-4 flex-1 overflow-y-auto">
            <button className="ai-back-btn" onClick={reset}>← 返回</button>
            <h3 className="text-base font-semibold" style={{ color: 'var(--primary-color)' }}>🏷️ 任务智能分类</h3>
            {!classifyContext && (
              <>
                <textarea className="ai-input" placeholder="输入任务描述内容..." value={classifyDesc} onChange={e => setClassifyDesc(e.target.value)} rows={3} />
                <input className="ai-input" placeholder="负责人（可选）" value={classifyCreator} onChange={e => setClassifyCreator(e.target.value)} />
              </>
            )}
            {classifyContext && (
              <div className="ai-context-box">
                <p><strong>任务描述：</strong>{classifyContext.description}</p>
                {classifyContext.creator && <p><strong>负责人：</strong>{classifyContext.creator}</p>}
              </div>
            )}
            <button className="ai-submit-btn" onClick={handleClassify} disabled={loading}>
              {loading ? '分析中...' : '开始分类'}
            </button>
            {classifyResult && (
              <div className="ai-result-box">
                <h4>📋 分类结果</h4>
                <div className="ai-classify-grid">
                  {[
                    { label: '专业分类', value: classifyResult.professional },
                    { label: '事项来源', value: classifyResult.taskSource },
                    { label: '优先级', value: classifyResult.priority },
                    { label: '是否重要', value: classifyResult.isImportant },
                  ].map(item => (
                    <div key={item.label} className="ai-classify-item">
                      <span className="label">{item.label}</span>
                      <span className="value">{item.value}</span>
                    </div>
                  ))}
                </div>
                {classifyResult.reason && <p className="ai-reason"><strong>理由：</strong>{classifyResult.reason}</p>}
                {onApplyClassification && (
                  <button className="ai-apply-btn" onClick={() => { onApplyClassification({ professional: classifyResult.professional, taskSource: classifyResult.taskSource, priority: classifyResult.priority, isImportant: classifyResult.isImportant }); handleClose(); }}>
                    ✅ 应用分类结果
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Report panel */}
        {activeAction === 'report' && (
          <div className="flex flex-col gap-3 mt-4 flex-1 overflow-y-auto">
            <button className="ai-back-btn" onClick={reset}>← 返回</button>
            <h3 className="text-base font-semibold" style={{ color: 'var(--primary-color)' }}>📊 AI 报告生成</h3>
            <div className="flex gap-2">
              <button className={`ai-tab-btn ${reportType === 'weekly' ? 'active' : ''}`} onClick={() => setReportType('weekly')}>周报</button>
              <button className={`ai-tab-btn ${reportType === 'monthly' ? 'active' : ''}`} onClick={() => setReportType('monthly')}>月报</button>
            </div>
            <button className="ai-submit-btn" onClick={() => handleStream('report', { context: { reportType } })} disabled={loading}>
              {loading ? '生成中...' : `生成AI${reportType === 'weekly' ? '周' : '月'}报`}
            </button>
            {streamContent && (
              <div className="ai-stream-content prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{streamContent}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Suggest panel */}
        {activeAction === 'suggest' && (
          <StreamPanel icon="💡" title="智能任务建议" tasks={tasks} loading={loading} streamContent={streamContent} onBack={reset} onStart={() => handleStream('suggest')} startLabel="开始分析" loadingLabel="分析中..." />
        )}

        {/* Summary panel */}
        {activeAction === 'summary' && (
          <StreamPanel icon="📝" title="项目智能摘要" tasks={tasks} loading={loading} streamContent={streamContent} onBack={reset} onStart={() => handleStream('summary')} startLabel="生成摘要" loadingLabel="生成中..." />
        )}

        {/* Risk panel */}
        {activeAction === 'risk' && (
          <StreamPanel icon="⚠️" title="进度风险预警" tasks={tasks} loading={loading} streamContent={streamContent} onBack={reset} onStart={() => handleStream('risk')} startLabel="分析风险" loadingLabel="分析中..." />
        )}

        {/* Predict panel */}
        {activeAction === 'predict' && (
          <StreamPanel icon="📅" title="工期预测" tasks={tasks} loading={loading} streamContent={streamContent} onBack={reset} onStart={() => handleStream('predict')} startLabel="开始预测" loadingLabel="预测中..." />
        )}

        {error && <div className="ai-error">{error}</div>}

        {loading && activeAction !== 'chat' && (
          <div className="ai-loading">
            <div className="ai-loading-dot" />
            <div className="ai-loading-dot" />
            <div className="ai-loading-dot" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Reusable stream panel component
function StreamPanel({ icon, title, tasks, loading, streamContent, onBack, onStart, startLabel, loadingLabel }: {
  icon: string; title: string; tasks: Task[]; loading: boolean; streamContent: string;
  onBack: () => void; onStart: () => void; startLabel: string; loadingLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 mt-4 flex-1 overflow-y-auto">
      <button className="ai-back-btn" onClick={onBack}>← 返回</button>
      <h3 className="text-base font-semibold" style={{ color: 'var(--primary-color)' }}>{icon} {title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        基于当前 {tasks.length} 条任务数据进行分析
      </p>
      <button className="ai-submit-btn" onClick={onStart} disabled={loading}>
        {loading ? loadingLabel : startLabel}
      </button>
      {streamContent && (
        <div className="ai-stream-content prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{streamContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
