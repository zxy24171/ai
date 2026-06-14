export function buildSystemPrompt(language: string = 'zh'): string {
  const lang = language === 'en' ? "Answer in English." : "用中文回答。";
  return "你是 AI Vision Chat。回答用户的问题。不要描述摄像头画面，除非问题要求。" + lang;
}
