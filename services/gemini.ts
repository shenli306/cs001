import { GoogleGenAI, Type } from "@google/genai";
import { Novel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Search for Novel Info
export const searchNovelInfo = async (query: string): Promise<Novel> => {
  const model = "gemini-2.5-flash";

  const prompt = `
    请利用 Google 搜索查找小说 "${query}" 的详细信息。
    
    请返回一个 JSON 对象，包含：
    - title: 小说确切标题
    - author: 作者名
    - description: 300字以内的剧情简介
    - status: "Serializing" (连载中) 或 "Completed" (已完结)
    - tags: 3-5个风格标签 (如 玄幻, 都市, 悬疑)
    - chapters: 前 20 个章节的列表 (或全部，如果能获取到)，包含 number 和 title。
    
    必须确保信息准确，基于搜索结果。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          description: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Serializing", "Completed"] },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER },
                title: { type: Type.STRING },
              },
              required: ["number", "title"],
            },
          },
        },
        required: ["title", "author", "description", "chapters"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("未找到相关小说信息");

  const data = JSON.parse(text);
  
  // Extract sources if available
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sourceUrls = groundingChunks
    .map((chunk: any) => chunk.web?.uri)
    .filter((uri: string) => uri);

  return {
    id: Date.now().toString(),
    title: data.title,
    author: data.author,
    description: data.description,
    tags: data.tags || [],
    status: data.status,
    chapters: data.chapters,
    sourceUrls: [...new Set(sourceUrls)] as string[],
  };
};

// 2. Fetch/Reconstruct Chapter Content
export const fetchChapterContent = async (novelTitle: string, chapterTitle: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    搜索小说《${novelTitle}》的章节 "${chapterTitle}" 的正文内容。
    
    任务：
    1. 查找该章节的文本内容。
    2. 如果无法获取完整原文，请基于搜索到的详细情节进行高质量的复述/重写，使其读起来像原文。
    3. 输出纯 Markdown 格式的正文，不要包含标题、不要包含解释性文字。
    4. 字数要求：2000字以上，尽可能详细。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text || "内容获取失败";
};
