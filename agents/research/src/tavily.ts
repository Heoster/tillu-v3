export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilyResult[];
}

export async function searchTavily(query: string, options: { maxResults?: number; topic?: "general" | "news" } = {}): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: Math.min(Math.max(options.maxResults ?? 5, 1), 10),
      topic: options.topic ?? "general",
      include_answer: true,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed with status ${response.status}`);
  }
  return (await response.json()) as TavilyResponse;
}

export function formatSearchContext(response: TavilyResponse): string {
  return response.results
    .map((result, index) => `[Source ${index + 1}] ${result.title}\nURL: ${result.url}\n${result.content}`)
    .join("\n\n");
}
