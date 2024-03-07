require("dotenv").config();
const express = require("express");
const ExpressWs = require("express-ws");

const { GptService } = require("./services/gpt-service");
const { StreamService } = require("./services/stream-service");
const { TranscriptionService } = require("./services/transcription-service");
const { TextToSpeechService } = require("./services/tts-service");

const app = express();
ExpressWs(app);

const PORT = process.env.PORT || 3000;
const INITIAL_MESSAGE =
  "Hello! I understand you're looking for a pair of AirPods, is that correct?";

app.post("/incoming", (req, res) => {
  // Respond with TwiML to initiate a WebSocket connection
  res.status(200);
  res.type("text/xml");
  res.end(`
  <Response>
    <Connect>
      <Stream url="wss://${process.env.SERVER}/connection" />
    </Connect>
  </Response>
  `);
});

app.ws("/connection", (ws, req) => {
  ws.on("error", console.error);
  // Filled in from start message
  let streamSid;

  const gptService = new GptService(INITIAL_MESSAGE);
  const streamService = new StreamService(ws);
  const transcriptionService = new TranscriptionService();
  const ttsService = new TextToSpeechService();

  // Incoming from MediaStream
  ws.on("message", function message(data) {
    const msg = JSON.parse(data);
    switch (msg.event) {
      // When a new media stream starts
      case "start":
        streamSid = msg.start.streamSid;
        streamService.setStreamSid(streamSid);
        console.log(`Twilio: Starting Media Stream for ${streamSid}`);
        // Generate initial Text-to-Speech response
        ttsService.generate({
          partialResponseIndex: null,
          partialResponse: INITIAL_MESSAGE,
        });
        break;

      // When media data is received
      case "media":
        transcriptionService.send(msg.media.payload);
        break;

      // When the media stream ends
      case "stop":
        console.log(`Twilio: Media stream ${streamSid} ended.`);
        transcriptionService.end();
        break;
    }
  });

  transcriptionService.on("utterance", async (text) => {
    console.log("TTS -> Twilio: Interruption Clearing stream");
    // Send a clear event to Twilio to stop streaming
    ws.send(
      JSON.stringify({
        streamSid,
        event: "clear",
      })
    );
  });

  transcriptionService.on("transcription", async (text) => {
    console.log(`STT -> GPT: ${text}`);
    // Send the transcribed text to the GPT service
    gptService.completion(text, "user");
  });

  gptService.on("gptreply", async (gptReply) => {
    console.log(`GPT -> TTS: ${gptReply.partialResponse}`);
    // Generate Text-to-Speech response based on GPT reply
    ttsService.generate(gptReply);
  });

  ttsService.on("speech", (responseIndex, audio, label) => {
    console.log(`TTS -> TWILIO: ${label}`);
    // Buffer the generated audio for streaming to Twilio
    streamService.buffer(responseIndex, audio);
  });
});

app.listen(PORT);
console.log(`Server running on port ${PORT}`);
