import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AnalysisResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Encodes a string to Base64 (helper for audio encoding if needed, though we receive base64)
 */
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data into an AudioBuffer
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Generates audio explanation for a story part using Gemini TTS
 */
export const generateExplanationAudio = async (text: string): Promise<AudioBuffer | null> => {
  try {
    // We send the text directly now so we can control exactly what the "teacher" says via the data structure
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore usually sounds clear
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
        console.error("No audio data received");
        return null;
    }

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      outputAudioContext,
      24000,
      1
    );

    return audioBuffer;

  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};

/**
 * Analyzes the user's writing to see if it fits the story section
 */
export const analyzeStoryDraft = async (
  sectionTitle: string,
  sectionDescription: string,
  userText: string
): Promise<AnalysisResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        Actúa como un profesor de escritura creativa divertido y amable de Latinoamérica.
        Analiza el siguiente texto escrito por un usuario para la sección de la historia: "${sectionTitle}".
        Instrucción dada al usuario: ${sectionDescription}.
        Texto del usuario: "${userText}".
        
        Determina si el texto del usuario coincide a grandes rasgos con el propósito de esta sección.
        Proporciona comentarios constructivos sobre el estilo o la redacción, y un mensaje corto de ánimo.
        Usa jerga ligera latinoamericana (como "chévere", "padre", "bacán", "buenazo") si corresponde, pero que sea entendible.
        Responde SIEMPRE en Español.
        Return JSON.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isRelevant: { type: Type.BOOLEAN, description: "True si el texto encaja con la definicion de la sección" },
            feedback: { type: Type.STRING, description: "Consejos específicos sobre el estilo o conexión con la trama en Español" },
            encouragement: { type: Type.STRING, description: "Un mensaje corto y divertido de felicitación en Español" }
          },
          required: ["isRelevant", "feedback", "encouragement"]
        }
      }
    });

    if (response.text) {
        return JSON.parse(response.text) as AnalysisResponse;
    }
    throw new Error("No text response from model");

  } catch (error) {
    console.error("Error analyzing text:", error);
    return {
      isRelevant: false,
      feedback: "¡Chispas! Hubo un error conectando con la IA. Inténtalo de nuevo.",
      encouragement: ""
    };
  }
};
