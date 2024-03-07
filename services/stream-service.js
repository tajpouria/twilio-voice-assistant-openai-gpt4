const EventEmitter = require("events");
const uuid = require("uuid");

class StreamService extends EventEmitter {
  constructor(websocket) {
    super();
    this.ws = websocket;
    this.expectedAudioIndex = 0;
    this.audioBuffer = {};
    this.streamSid = "";
  }

  setStreamSid(streamSid) {
    this.streamSid = streamSid;
  }

  // Buffer incoming audio based on the provided index
  buffer(index, audio) {
    // If the index is null, send the audio immediately
    if (index === null) {
      this.sendAudio(audio);
    } else if (index === this.expectedAudioIndex) {
      // If the index matches the expected index, send the audio and process buffered audio
      this.sendAudio(audio);
      this.expectedAudioIndex++;

      // Check for and send any buffered audio with consecutive indices
      while (this.audioBuffer.hasOwnProperty(this.expectedAudioIndex)) {
        const bufferedAudio = this.audioBuffer[this.expectedAudioIndex];
        this.sendAudio(bufferedAudio);
        delete this.audioBuffer[this.expectedAudioIndex];
        this.expectedAudioIndex++;
      }
    } else {
      // If the index doesn't match the expected index, buffer the audio
      this.audioBuffer[index] = audio;
    }
  }

  sendAudio(audio) {
    // Send audio payload and mark the message with a unique identifier
    this.ws.send(this.formatMessage("media", { payload: audio }));
    this.ws.send(this.formatMessage("mark", { name: uuid.v4() }));
  }

  formatMessage(event, data) {
    return JSON.stringify({ streamSid: this.streamSid, event, [event]: data });
  }
}

module.exports = { StreamService };
