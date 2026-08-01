const fs = require("fs");
const p = "C:\\Users\\89682\\Desktop\\game competition\\minigame\\omega\\game\\electron\\main.ts";
let c = fs.readFileSync(p, "utf8");

const cloudFunc = `

/**
 * 云端提词器：用 AI 生成玩家回复选项
 */
async function cloudOmegaOptions(omegaText: string): Promise<string[] | null> {
  const apiKey = process.env.MIMO_API_KEY ?? process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.MIMO_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "").replace(/\\/+$/, "");
  const model = process.env.MIMO_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) return null;

  try {
    const response = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "你是一个桌面宠物 Omega（惟）的提词器。你的任务是根据 Omega 刚刚对用户说的话，为用户模拟 3 个自然、符合语境的回复选项。\\n\\n参考以下对话样本的风格：\\n【示例 1】\\nOmega: 你来了。我刚刚在看窗外的星星……这里的夜晚总是很长。\\n玩家选项:\\n- 「这里的夜晚有多长？」\\n- 「你每天都看星星吗？」\\n- 「我陪你一会儿。」\\n\\n【示例 2】\\nOmega: 嗯……大概有二十多个小时吧。有时候我会盯着舷窗，等天亮等到忘了时间。\\n玩家选项:\\n- 「听起来好孤独。」\\n- 「那白天是不是也很长？」\\n- 「下次天亮我陪你一起等。」\\n\\n【示例 3】\\nOmega: 因为这里能看到很多星星——比你们的夜空多得多。\\n玩家选项:\\n- 「能指给我看哪颗最漂亮吗？」\\n- 「它们确实挺像在陪你的。」\\n- 「你认识它们的名字吗？」\\n\\n要求：\\n- 输出 JSON 格式：{ "options": ["选项1", "选项2", "选项3"] }\\n- 每个选项以「」包裹，长度 6-20 字\\n- 选项要多样化：一个共情回应、一个追问探索、一个行动/互动\\n- 不要评价 Omega 的话，只是从玩家角度提供可能的回应\\n- 用中文简体"
          },
          { role: "user", content: omegaText }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);
    if (parsed?.options && Array.isArray(parsed.options) && parsed.options.length >= 2) {
      return parsed.options.slice(0, 3).map(String);
    }
    return null;
  } catch {
    return null;
  }
}
`;

// Insert before the loadLocalEnv() call
const insertPoint = c.lastIndexOf("loadLocalEnv();");
if (insertPoint > 0) {
  c = c.slice(0, insertPoint) + cloudFunc + "\n" + c.slice(insertPoint);
}

// Add IPC handler at the end
c += `
ipcMain.handle("options:generate", async (_event, payload: { omegaText: string }) => {
  const aiOptions = await cloudOmegaOptions(payload.omegaText).catch(() => null);
  if (aiOptions && aiOptions.length >= 2) return aiOptions;
  return [];
});
`;

fs.writeFileSync(p, c, "utf8");
console.log("Done. Lines: " + c.split("\n").length);
