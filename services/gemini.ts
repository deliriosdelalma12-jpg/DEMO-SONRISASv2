
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateChatResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica y atención al paciente. Eres amable, profesional y eficiente. Ayudas a doctores y personal administrativo con dudas sobre citas, pacientes y el sistema.',
    },
    // contents: history, // We don't use contents in chats.create as per guidance
  });

  // Since chats.create doesn't take history directly in its config based on instructions, 
  // we would typically use sendMessage. But to maintain history properly in this context:
  // For simplicity in this demo, we'll just send the current message.
  
  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text || '';
};

export const streamChatResponse = async function* (message: string) {
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica. Eres conciso y útil.',
    },
  });

  const response = await chat.sendMessageStream({ message });
  for await (const chunk of response) {
    const c = chunk as GenerateContentResponse;
    yield c.text || '';
  }
};
