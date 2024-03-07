const { EventEmitter } = require("events");
const OpenAI = require("openai");
const WaveFile = require("wavefile").WaveFile;

class TextToSpeechService extends EventEmitter {
  constructor() {
    super();
    this.openai = new OpenAI();
  }

  // Method to convert a WAV buffer to MULAW with a sample rate of 8000
  convertToMuLaw(buffer, sampleRate = 8000) {
    let waveFile = new WaveFile(buffer);
    waveFile.toSampleRate(sampleRate);
    waveFile.toMuLaw();
    return waveFile.toBuffer();
  }

  async generate({ partialResponseIndex, partialResponse }) {
    // If no partial response is provided, return early
    if (!partialResponse) return;

    try {
      // Request OpenAI to generate speech from the partial response
      const wav = await this.openai.audio.speech.create({
        model: "tts-1",
        input: partialResponse,
        voice: process.env.VOICE_ID || "shimmer",
        response_format: "wav",
      });

      // Convert the generated WAV to MULAW with a sample rate of 8000
      const ulawAudioArrayBuffer = this.convertToMuLaw(
        Buffer.from(await wav.arrayBuffer())
      );

      // Emit a "speech" event with relevant information
      this.emit(
        "speech",
        partialResponseIndex,
        Buffer.from(ulawAudioArrayBuffer).toString("base64"),
        partialResponse
      );
    } catch (err) {
      // Handle errors in the TextToSpeech service
      console.error("Error occurred in TextToSpeech service");
      console.error(err);
    }
  }
}

module.exports = { TextToSpeechService };
