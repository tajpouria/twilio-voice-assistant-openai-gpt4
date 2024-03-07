const { EventEmitter } = require("events");
const { SpeechClient } = require("@google-cloud/speech");

class TranscriptionService extends EventEmitter {
  constructor() {
    super();

    // Create a new instance of the Google SpeechClient
    const client = new SpeechClient();

    // Set up the configuration for the speech recognition request
    const request = {
      config: {
        encoding: "MULAW",
        sampleRateHertz: 8000,
        languageCode: "en-GB",
        // Enable multi-language recognition
        // alternativeLanguageCodes: ["en-US"],
      },
      interimResults: true,
    };

    // Create a streaming recognition instance and set up event handlers
    this.recognizeStream = client
      .streamingRecognize(request)
      .on("error", console.error)
      .on("data", (data) => {
        // Extract information from the received data
        const isFinal = data.results[0].isFinal;
        const transcript = data.results[0].alternatives[0].transcript;

        if (!transcript) {
          return;
        }

        // Check if the received speech is final
        if (isFinal) {
          // Log and emit the final transcription
          console.log("Final speech received:", transcript);
          this.emit("transcription", transcript);
        } else if (transcript.split(" ").length > 3) {
          // Check if the collected text is longer than 3 words, consider it an utterance
          // Log and emit the collected text as an utterance
          console.log(
            "UtteranceEnd received before final speech, emit collected text:",
            transcript
          );
          this.emit("utterance", transcript);
        }
      });
  }

  // Method to send audio payload to the Google Speech API
  // Payload is a MULAW 8000Hz audio buffer
  send(payload) {
    this.recognizeStream.write(payload);
  }

  // Method to end the Google Speech API connection
  end() {
    this.recognizeStream.end();
  }
}

module.exports = { TranscriptionService };
