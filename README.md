# Twilio Voice Assistant with OpenAI GPT 4

These service combine to create a voice application that is better at transcribing, understanding, and speaking than traditional interactive voice response systems.

Features:

- 🏁 Returns responses with low latency, typically 1 second by utilizing streaming.
- ❗️ Allows the user to interrupt the GPT assistant and ask a different question.
- 📔 Maintains chat history with GPT.
- 🛠️ Allows the GPT to call external tools.

## Setting up for Development

### Prerequisites

Sign up for the following services and get an API key for each:

- [Google Cloud Platform](https://cloud.google.com/gcp): Before you can begin using Text-to-Speech, [you must enable the API in the Google Cloud Platform Console](https://cloud.google.com/text-to-speech/docs/before-you-begin) and set up your credentials.
- [OpenAI](https://platform.openai.com/signup)

### 1. Start Ngrok

Start an [ngrok](https://ngrok.com) tunnel for port `3000`:

```bash
ngrok http 3000
```

Ngrok will give you a unique URL, like `abc123.ngrok.io`. Copy the URL without http:// or https://. You'll need this URL in the next step.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure the following environment variables:

```bash
# Your ngrok or server URL
# E.g. 123.ngrok.io
SERVER="123.ngrok.io"

# OpenAI API key
OPENAI_API_KEY="sk-1234567890"

# Google Cloud credentials
GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/google/credentials.json"
```

### 3. Install Dependencies

Install the necessary packages:

```bash
npm install
```

### 4. Start Your Server in Development Mode

Run the following command:

```bash
npm run dev
```

This will start your app using `nodemon` so that any changes to your code automatically refreshes and restarts the server.

### 5. Configure an Incoming Phone Number

Connect a phone number using the [Twilio Console](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming).

You can also use the Twilio CLI:

```bash
twilio phone-numbers:update +1[your-twilio-number] --voice-url=https://your-server.ngrok.io/incoming
```

This configuration tells Twilio to send incoming call audio to your app when someone calls your number. The app responds to the incoming call webhook with a [Stream](https://www.twilio.com/docs/voice/twiml/stream) TwiML verb that will connect an audio media stream to your websocket server.
