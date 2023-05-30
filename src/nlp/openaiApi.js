import axios from "axios";
import rateLimit from "axios-rate-limit";
const openaiModel = "gpt-3.5-turbo";
const openaiUrl = "https://api.api2gpt.com/v1/chat/completions";
// const openaiUrl = "https://api.openai.com/v1/chat/completions";
const openaiClient = rateLimit(
    axios.create({
        headers: {
            // Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            Authorization: `Bearer ${import.meta.env.VITE_API2GPT_API_KEY}`,
        },
        proxy: {
            host: "127.0.0.1",
            port: 7890,
        },
    }),
    { maxRequests: 2, perMilliseconds: 10000 }
);

export async function keywordExtraction(input) {
    let prompt = `
        Determine five topics that are being discussed in the following text, which is delimited by triple backticks.
        
        Make each item one or two words long. And the item should be the same language as the sample
        
        Format your response as a python array separated by commas. No more other things.
        
        Text sample: '''${input}'''
    `;
    const request = {
        model: openaiModel,
        temperature: 0,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    };
    let result = "";
    await openaiClient.post(openaiUrl, request).then(async (response) => {
        console.log(response);
        const answer = await response.data.choices[0].message.content;
        const keywords = await eval(answer);
        result = keywords;
    });
    console.log(result);
    return result;
}

export async function classification(text, labels) {
    let prompt = `
        Here is some labels: ${labels} \n

        Sort the labels by how similar with the following text, which is delimited by triple backticks.
        
        Format your response as a python array separated by commas. No more other things.
        
        Text sample: '''${text}'''
    `;
    const request = {
        model: openaiModel,
        temperature: 0,
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    };
    let result = "";
    await openaiClient.post(openaiUrl, request).then(async (response) => {
        console.log(response);
        const answer = await response.data.choices[0].message.content;
        const keywords = await eval(answer);
        result = keywords;
    });
    console.log(result);
    return result;
}
