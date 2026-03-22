import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, tasks, context, messages } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (action === "classify") {
      systemPrompt = `你是一个项目管理AI助手，专门负责任务智能分类。
根据任务描述内容，推荐最合适的：
- 专业分类（可选：建筑、结构、机电、景观、精装）
- 事项来源（可选：设计管理、招标管理、合同管理、配套管理、施工管理、变更管理）
- 优先级（可选：高、中、低）
- 是否重要（可选：是、否）`;

      userPrompt = `请为以下任务进行智能分类：
任务描述：${context?.description || ""}
负责人：${context?.creator || "未指定"}
${context?.comments ? `任务进展：${context.comments}` : ""}

请直接返回JSON格式，不要其他文字。`;

    } else if (action === "report") {
      systemPrompt = `你是一个专业的项目管理报告撰写AI助手。你需要根据提供的任务数据，生成结构化、专业的项目${context?.reportType === 'weekly' ? '周' : '月'}报。
报告应包含：
1. **总体概况**：任务总数、完成率、各状态分布（用数字和百分比）
2. **本期重点工作**：按专业分类归纳主要完成的工作内容，重点突出关键节点和里程碑
3. **各专业进展**：分专业详述工作进展，引用具体任务数据
4. **存在问题与风险**：
   - 逾期任务清单（含逾期天数）
   - 临期任务预警（7天内到期）
   - 资源或协调问题分析
5. **下阶段工作计划**：基于当前进度推断下阶段重点工作
6. **建议与措施**：针对风险提出具体改进措施

语言风格：简洁专业，数据驱动，适合向甲方或领导汇报。使用Markdown格式，合理使用表格展示统计数据。`;

      const taskSummary = (tasks || []).map((t: any) =>
        `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 负责人:${t.creator || '未指定'} | 计划完成:${t.planDate || '未设置'} | 优先级:${t.priority || '未设置'} | 重要性:${t.isImportant || '未设置'} | 进展:${t.comments || '无'}`
      ).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      userPrompt = `今天日期：${today}
以下是当前项目的任务列表（共${(tasks || []).length}条），请生成${context?.reportType === 'weekly' ? '周' : '月'}报：

${taskSummary}

报告时间范围：${context?.period || '本期'}`;

    } else if (action === "suggest") {
      systemPrompt = `你是一个资深项目管理AI助手，擅长建筑工程项目管理。请根据当前项目任务情况，提供深度分析和智能建议。

你的分析应该：
1. **遗漏工作识别**：基于建筑工程常见流程，分析可能遗漏的关键工作项（如报审、验收、材料送检等），每条建议说明原因和紧迫性
2. **风险深度分析**：
   - 进度风险：分析任务延期模式和瓶颈
   - 质量风险：分析是否缺少质检、验收环节
   - 协调风险：分析多专业交叉施工可能的冲突
3. **工作优化建议**：
   - 任务优先级调整建议
   - 资源分配优化
   - 关键路径识别
4. **可执行的下一步行动**：列出3-5个立即可执行的具体行动

返回格式为Markdown，使用清晰的层级结构。每条建议都要具体，避免泛泛而谈。`;

      const taskSummary = (tasks || []).map((t: any) =>
        `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 负责人:${t.creator || '未指定'} | 创建:${t.createDate || '未知'} | 计划:${t.planDate || '未设置'} | 进展:${t.comments || '无'}`
      ).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      userPrompt = `今天日期：${today}
以下是当前项目的所有任务（共${(tasks || []).length}条）：

${taskSummary}

请进行深度分析并提供建议。`;

    } else if (action === "summary") {
      systemPrompt = `你是一个项目管理AI助手。请根据提供的任务数据，生成简洁精炼的项目摘要。
摘要应该一目了然地反映项目当前状态，包括：
- 项目整体进度概况（一句话）
- 各专业/各来源的进展亮点
- 当前最需关注的事项
- 关键数据指标

输出控制在300字以内，语言简洁有力。使用Markdown格式。`;

      const taskSummary = (tasks || []).map((t: any) =>
        `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 计划:${t.planDate || '未设置'} | 进展:${t.comments || '无'}`
      ).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      userPrompt = `今天日期：${today}
任务数据（共${(tasks || []).length}条）：

${taskSummary}`;

    } else if (action === "risk") {
      systemPrompt = `你是一个项目风险分析AI专家，擅长建筑工程项目进度管控。请对提供的任务数据进行全面的风险分析。

分析维度：
1. **进度风险评估**：
   - 🔴 高风险（已逾期或严重滞后的任务）
   - 🟡 中风险（即将到期或进度偏慢的任务）
   - 🟢 低风险（正常推进的任务）
2. **风险趋势分析**：整体项目是否在恶化、稳定还是改善
3. **瓶颈识别**：哪些专业或环节是当前瓶颈
4. **连锁影响分析**：某个任务延期可能影响的后续工作
5. **应对建议**：针对每个高/中风险给出具体的应对措施

使用醒目的emoji和颜色标记来突出风险等级。输出Markdown格式。`;

      const taskSummary = (tasks || []).map((t: any) =>
        `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 创建:${t.createDate || '未知'} | 计划完成:${t.planDate || '未设置'} | 进展:${t.comments || '无'}`
      ).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      userPrompt = `今天日期：${today}
请对以下项目任务进行风险分析（共${(tasks || []).length}条）：

${taskSummary}`;

    } else if (action === "predict") {
      systemPrompt = `你是一个项目工期预测AI专家。基于已有任务的创建时间、计划时间和完成进度，分析并预测项目整体工期。

请分析：
1. **当前进度评估**：整体完成百分比，各专业完成率
2. **工期预测**：
   - 乐观估计（一切顺利的情况）
   - 最可能估计（基于当前节奏）
   - 悲观估计（考虑风险因素）
3. **关键里程碑预测**：预测各个关键节点的可能完成时间
4. **加速建议**：如何压缩工期的可行措施

使用Markdown格式，可以用表格展示预测数据。`;

      const taskSummary = (tasks || []).map((t: any) =>
        `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 创建:${t.createDate || '未知'} | 计划完成:${t.planDate || '未设置'} | 进展:${t.comments || '无'}`
      ).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      userPrompt = `今天日期：${today}
请基于以下任务数据预测项目工期（共${(tasks || []).length}条）：

${taskSummary}`;

    } else if (action === "chat") {
      // Free-form chat with project context
      systemPrompt = `你是一个专业的建筑工程项目管理AI助手。你可以回答用户关于项目管理、工程技术、进度控制、质量管理等方面的问题。

你当前掌握的项目任务数据如下：
${(tasks || []).map((t: any) =>
  `[${t.professional}/${t.taskSource}] ${t.description} | 状态:${t.status} | 负责人:${t.creator || '未指定'} | 计划:${t.planDate || '未设置'} | 进展:${t.comments || '无'}`
).join("\n")}

请基于这些数据回答用户的问题。回答要专业、准确、有针对性。使用Markdown格式。`;

      // For chat, we use the messages array directly
      const body: any = {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
      };

      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI额度不足，请充值" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error: " + status);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });

    } else {
      throw new Error("Unknown action: " + action);
    }

    // Use tool calling for classify action to get structured output
    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (action === "classify") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "classify_task",
            description: "对任务进行智能分类，返回推荐的专业分类、事项来源、优先级和重要性",
            parameters: {
              type: "object",
              properties: {
                professional: { type: "string", enum: ["建筑", "结构", "机电", "景观", "精装"], description: "推荐的专业分类" },
                taskSource: { type: "string", enum: ["设计管理", "招标管理", "合同管理", "配套管理", "施工管理", "变更管理"], description: "推荐的事项来源" },
                priority: { type: "string", enum: ["高", "中", "低"], description: "推荐的优先级" },
                isImportant: { type: "string", enum: ["是", "否"], description: "是否重要" },
                reason: { type: "string", description: "分类理由，简要说明" },
              },
              required: ["professional", "taskSource", "priority", "isImportant", "reason"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "classify_task" } };
    }

    if (action === "classify") {
      // Non-streaming for structured output
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI额度不足，请充值" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error: " + status);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Fallback
      return new Response(JSON.stringify({ result: data.choices?.[0]?.message?.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Streaming for report, suggest, summary, risk, predict
      body.stream = true;
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI额度不足，请充值" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error: " + status);
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
