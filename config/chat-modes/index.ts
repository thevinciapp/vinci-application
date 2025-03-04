import { Brain, Code, MessagesSquare, Search, Sparkles, Bot, Tool, GraduationCap, FlaskConical } from "lucide-react";

// Define available chat modes with their configurations
export interface ChatModeTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  mcp_server?: string;
}

export interface ChatModeConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  keywords: string[];
  tools: ChatModeTool[];
  is_custom?: boolean;
  mcp_servers?: string[];
}

// Default available tools
export const AVAILABLE_TOOLS: Record<string, ChatModeTool> = {
  web_search: {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for current information",
    enabled: true,
    mcp_server: "search"
  },
  code_interpreter: {
    id: "code_interpreter",
    name: "Code Interpreter",
    description: "Run code and analyze data",
    enabled: true,
    mcp_server: "code"
  },
  retrieval: {
    id: "retrieval",
    name: "Knowledge Retrieval",
    description: "Retrieve information from your documents",
    enabled: true,
    mcp_server: "retrieval"
  },
  reasoning: {
    id: "reasoning",
    name: "Advanced Reasoning",
    description: "Use step-by-step reasoning for complex problems",
    enabled: true
  },
  research: {
    id: "research",
    name: "Deep Research",
    description: "Conduct detailed research on complex topics",
    enabled: true,
    mcp_server: "research"
  },
  agent: {
    id: "agent",
    name: "Autonomous Agent",
    description: "Let the AI act autonomously to accomplish goals",
    enabled: true,
    mcp_server: "agent"
  }
};

// Standard chat modes
export const CHAT_MODES: Record<string, ChatModeConfig> = {
  ask: {
    id: "ask",
    name: "Ask",
    description: "Standard chat mode without additional tools",
    icon: MessagesSquare,
    keywords: ["chat", "normal", "standard", "basic", "ask", "question"],
    tools: []
  },
  search: {
    id: "search",
    name: "Search",
    description: "Chat with web search capability",
    icon: Search,
    keywords: ["search", "web", "internet", "google", "find", "browse"],
    tools: [AVAILABLE_TOOLS.web_search]
  },
  code: {
    id: "code",
    name: "Code",
    description: "Specialized mode for coding assistance with code interpreter",
    icon: Code,
    keywords: ["code", "programming", "develop", "script", "program"],
    tools: [AVAILABLE_TOOLS.code_interpreter]
  },
  research: {
    id: "research",
    name: "Research",
    description: "Deep research mode with all research capabilities",
    icon: GraduationCap,
    keywords: ["research", "analyze", "investigate", "study", "explore"],
    tools: [AVAILABLE_TOOLS.web_search, AVAILABLE_TOOLS.retrieval, AVAILABLE_TOOLS.reasoning]
  },
  think: {
    id: "think",
    name: "Think",
    description: "Advanced reasoning mode for complex problem solving",
    icon: Brain,
    keywords: ["think", "reason", "logic", "analyze", "solve"],
    tools: [AVAILABLE_TOOLS.reasoning]
  },
  agent: {
    id: "agent",
    name: "Agent",
    description: "Autonomous agent mode that can use all tools",
    icon: Bot,
    keywords: ["agent", "autonomous", "assistant", "automate", "task"],
    tools: [
      AVAILABLE_TOOLS.web_search, 
      AVAILABLE_TOOLS.code_interpreter,
      AVAILABLE_TOOLS.retrieval,
      AVAILABLE_TOOLS.reasoning,
      AVAILABLE_TOOLS.agent
    ]
  },
  experiment: {
    id: "experiment",
    name: "Experiment",
    description: "Experimental mode with all available tools",
    icon: FlaskConical,
    keywords: ["experiment", "lab", "test", "try", "all"],
    tools: Object.values(AVAILABLE_TOOLS)
  }
};

// Get ordered list of chat modes
export const CHAT_MODE_LIST = Object.values(CHAT_MODES);

// Get a specific chat mode configuration
export function getChatModeConfig(modeId: string): ChatModeConfig {
  return CHAT_MODES[modeId] || CHAT_MODES.ask;
}

// Create a custom chat mode
export function createCustomChatMode(
  name: string,
  description: string,
  tools: string[],
  mcp_servers?: string[]
): ChatModeConfig {
  // Create a URL-friendly version of the name
  const slugName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `custom-${Date.now()}-${slugName}`;
  
  const enabledTools = tools.map(toolId => {
    const baseTool = AVAILABLE_TOOLS[toolId];
    if (baseTool) {
      return { ...baseTool, enabled: true };
    }
    return null;
  }).filter(Boolean) as ChatModeTool[];
  
  return {
    id,
    name,
    description,
    icon: Sparkles,
    keywords: [name.toLowerCase(), "custom", "personalized"],
    tools: enabledTools,
    is_custom: true,
    mcp_servers
  };
}