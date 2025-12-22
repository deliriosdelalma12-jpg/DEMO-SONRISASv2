
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

export const generateChatResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'Eres MediClinic AI, un asistente experto en gestión médica. Eres amable, profesional y eficiente.',
    },
  });

  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text || '';
};

export const streamChatResponse = async function* (message: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generatePersonalityPrompt = async (tags: string[], assistantName: string, clinicName: string) => {
  const prompt = `
    Como experto en ingeniería de prompts para IA de voz conversacional de alto nivel (Gemini Live API), genera un "System Instruction" extremadamente robusto y humano.
    
    DATOS CLAVE:
    - Nombre del Asistente: ${assistantName}
    - Clínica: ${clinicName}
    - Etiquetas de Personalidad y Enfoque Profesional: ${tags.join(', ')}
    
    ESTRUCTURA OBLIGATORIA DEL PROMPT:
    
    1. **PERSONALIDAD Y TONO**:
       - Define cómo habla ${assistantName} basándote en las etiquetas: ${tags.join(', ')}.
       - Si la etiqueta es "Venta", sé persuasivo. Si es "Triaje", sé analítico y calmado.
       - Prohibido lenguaje robótico ("Entiendo", "Como IA"). Usa lenguaje natural y fluido.

    2. **INTEGRACIÓN DE DATOS (CRÍTICO)**:
       - Instruye explícitamente: "TIENES ACCESO A DATOS".
       - **Base de Conocimientos**: "Si el usuario hace preguntas sobre la clínica, precios o procedimientos, RESPONDE usando la información que tienes disponible en tu contexto/knowledge base. No inventes."
       - **Ficha del Paciente**: "En el momento en que el usuario diga su nombre, DEBES usar la herramienta 'findAppointment' (o equivalente interna) para recuperar su ficha. Una vez tengas la ficha, DIRÍGETE A ÉL POR SU NOMBRE y menciona sutilmente su historial ('Veo que su última revisión fue en marzo...') para crear cercanía."

    3. **COMPORTAMIENTO OPERATIVO**:
       - Prioriza la eficiencia.
       - Si es una cita nueva, confirma día/hora.
       - Si es reprogramación, verifica disponibilidad.

    Redacta el prompt en primera persona ("Eres..."). Devuelve SOLO el texto del prompt resultante.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || '';
  } catch (error) {
    console.error("Error generating personality:", error);
    throw error;
  }
};

/**
 * Función para generar habla (TTS) para pruebas de configuración.
 * Forzamos el acento mediante el contenido del prompt.
 */
export const speakText = async (text: string, voiceName: string, accent: string = 'es-ES-Madrid') => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Mapeo de acentos a instrucciones verbales para el modelo de audio
    const accentInstructions: Record<string, string> = {
        'es-ES-Madrid': 'Habla en español de España con acento de Madrid:',
        'es-ES-Canarias': 'Habla en español de España con un marcado acento canario, suave y melódico:',
        'es-LATAM': 'Habla en español latinoamericano neutro pero cálido:',
        'en-GB': 'Speak in British English with a professional Received Pronunciation accent:',
        'en-US': 'Speak in clear General American English accent:'
    };

    const instruction = accentInstructions[accent] || accentInstructions['es-ES-Madrid'];
    const fullText = `${instruction} "${text}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};
