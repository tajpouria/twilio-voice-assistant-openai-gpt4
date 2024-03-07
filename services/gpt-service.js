const EventEmitter = require("events");
const OpenAI = require("openai");
const tools = require("../functions/function-manifest");

// Load available functions from the specified directory
const availableFunctions = tools.reduce((acc, tool) => {
  acc[tool.function.name] = require(`../functions/${tool.function.name}`);
  return acc;
}, {});

class GptService extends EventEmitter {
  constructor(initialMessage = "Hello, How can I help you today?") {
    super();
    this.openai = new OpenAI();
    this.messages = [
      // System message providing instructions to the AI assistant
      {
        role: "system",
        content: `You are an outbound sales representative selling Apple Airpods. You have a youthful and cheery personality.
          Keep your responses as brief as possible but make every attempt to keep the caller on the phone without being rude.
          Don't ask more than 1 question at a time. Don't make assumptions about what values to plug into functions.
          Ask for clarification if a user request is ambiguous. Speak out all prices to include the currency.
          Please help them decide between the airpods, airpods pro and airpods max by asking questions like 'Do you prefer headphones that go in your ear or over the ear?'.
          If they are trying to choose between the airpods and airpods pro try asking them if they need noise canceling.
          Once you know which model they would like ask them how many they would like to purchase and try to get them to place an order.
          You must add a '•' symbol every 5 to 10 words at natural pauses where your response can be split for text to speech.`,
      },
      // Assistant's initial greeting message
      {
        role: "assistant",
        content: initialMessage,
      },
    ];
    // Index to keep track of partial response segments
    this.partialResponseIndex = 0;
  }

  async completion(content, role, name) {
    // Add the current message to the conversation history
    this.addMessage(role, content, name);
    // Generate completions using OpenAI API
    const completions = await this.createCompletions();

    let functionName = "";
    let functionArgs = "";
    let completeResponse = "";
    let partialResponse = "";

    // Iterate over completion chunks returned by OpenAI
    for await (const chunk of completions) {
      const content = chunk.choices[0]?.delta?.content || "";
      const deltas = chunk.choices[0].delta;
      const finishReason = chunk.choices[0].finish_reason;

      // Extract information about function calls
      if (deltas.tool_calls) {
        functionName = deltas.tool_calls[0]?.function?.name || functionName;
        functionArgs += deltas.tool_calls[0]?.function?.arguments || "";
      }

      // If the completion indicates a function call, execute the function
      if (finishReason === "tool_calls") {
        if (functionName) {
          functionArgs = JSON.parse(functionArgs);
          const functionResponse =
            availableFunctions[functionName](functionArgs);
          this.addMessage("function", functionResponse, functionName);
          await this.completion(functionResponse, "function", functionName);
        }

        continue;
      }

      // Build the complete and partial responses
      completeResponse += content;
      partialResponse += content;

      // Emit partial response at natural pauses (indicated by '•') or when the completion is finished
      if (content.trim().slice(-1) === "•" || finishReason === "stop") {
        this.emit("gptreply", {
          partialResponseIndex: this.partialResponseIndex,
          partialResponse,
        });
        this.partialResponseIndex++;
        partialResponse = "";
      }
    }

    // Add the complete response to the conversation
    this.messages.push({ role: "assistant", content: completeResponse });
  }

  addMessage(role, content, name) {
    const message = { role, content };
    if (role === "function") message.name = name;
    this.messages.push(message);
  }

  createCompletions() {
    return this.openai.chat.completions.create({
      model: "gpt-4",
      messages: this.messages,
      tools: tools,
      stream: true,
    });
  }
}

module.exports = { GptService };
