const fs = require("fs");
const p = "C:\\Users\\89682\\Desktop\\game competition\\minigame\\omega\\game\\src\\components\\FloatingWindow.tsx";
let c = fs.readFileSync(p, "utf8");

// 1: Replace narrative imports
const o1 = "import {\n  pickNarrativeEntry,\n  getNarrativeNode,\n  followNarrativeOption,\n  type NarrativeNode,\n  type NarrativeOption,\n} from \"../systems/narrative\";";
const n1 = "import { generateOptions } from \"../systems/optionAgent\";\nimport type { AgentOption } from \"../systems/optionAgent\";";
c = c.replace(o1, n1);

// 2: Remove old states
c = c.replace('const [narrativeNodeId, setNarrativeNodeId] = useState<string | null>(null);\n  const [narrativeOptions, setNarrativeOptions] = useState<NarrativeOption[]>([]);\n', "");

// 3: Add agentOptions
const s = "const [suggestions, setSuggestions] = useState<string[]>([]);";
c = c.replace(s, s + "\n  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);");

// 4: Replace narrative callback
const o4 = "  // ---------- 叙事系统 ----------\n  const pickNarrativeNode = useCallback(() => {\n    const entry = pickNarrativeEntry(stateRef.current);\n    if (!entry) { setNarrativeNodeId(null); setNarrativeOptions([]); return; }\n    const node = getNarrativeNode(entry.firstNodeId);\n    if (node) { setNarrativeNodeId(node.id); setNarrativeOptions(node.options.slice(0, 3)); }\n  }, []);";
const n4 = "  // ---------- 提词器 Agent：根据 Omega 的发言为玩家生成 3 个回复选项 ----------\n  const generateAgentOptions = useCallback(async () => {\n    try {\n      const omegaLines = sessionLog.filter(l => l.speaker === \"omega\");\n      const lastOmega = omegaLines[omegaLines.length - 1]?.text ?? \"\";\n      if (!lastOmega) { setAgentOptions([]); return; }\n      const opts = await generateOptions(lastOmega, stateRef.current, sessionLog);\n      setAgentOptions(opts);\n    } catch {\n      setAgentOptions([]);\n    }\n  }, []);";
c = c.replace(o4, n4);

// 5
c = c.replace("    setNarrativeOptions([]);", "    setAgentOptions([]);");

// 6
c = c.replace("      setTimeout(() => pickNarrativeNode(), 200);", "      // 提词器 Agent：根据 Omega 的发言为玩家生成 3 个回复选项\n      generateAgentOptions();");

// 7
c = c.replace("  }, [includeScreenshot, setState, refreshLog, pickNarrativeNode]);", "  }, [includeScreenshot, setState, refreshLog, generateAgentOptions]);");

// 8
c = c.replace("      pickNarrativeNode();", "      generateAgentOptions();");

// 9: Replace narrative options block
const o9 = "{narrativeOptions.length > 0 && !busy && (\n            <div className=\"narrative-options\">\n              {narrativeOptions.map((opt, idx) => (\n                <button\n                  key={idx}\n                  type=\"button\"\n                  className=\"narrative-option-btn\"\n                  onClick={(e) => {\n                    e?.stopPropagation();\n                    sendMessageWithText(opt.text);\n                  }}\n                >\n                  {opt.text}\n                </button>\n              ))}\n            </div>\n          )}";
const n9 = "{agentOptions.length > 0 && !busy && (\n            <div className=\"narrative-options\">\n              {agentOptions.map((opt, idx) => (\n                <button\n                  key={idx}\n                  type=\"button\"\n                  className=\"narrative-option-btn\"\n                  onClick={(e) => {\n                    e?.stopPropagation();\n                    sendMessageWithText(opt.text);\n                  }}\n                >\n                  {opt.text}\n                </button>\n              ))}\n            </div>\n          )}";
c = c.replace(o9, n9);

// 10: Remove suggestions UI block
const o10 = "{suggestions.length > 0 && (\n            <div className=\"narrative-panel\">\n              <div className=\"narrative-choices\">\n                {suggestions.map((choice, ci) => (\n                  <button\n                    key={ci}\n                    type=\"button\"\n                    className=\"narrative-choice-btn\"\n                    onClick={() => setInput(choice)}\n                  >\n                    {choice}\n                  </button>\n                ))}\n              </div>\n            </div>\n          )}";
c = c.replace(o10, "");

// 11: Remove if (response.narrativeChoices) block
c = c.replace('      if (response.narrativeChoices) {\n        setSuggestions(response.narrativeChoices);\n      }\n', "");

fs.writeFileSync(p, c, "utf8");
console.log("OK lines:", c.split("\n").length);
