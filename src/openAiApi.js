import axios from "axios";
const openaiApiKey = "xx";
const openaiModel = "text-curie-001"; //text-davinci-003 //gpt-3.5-turbo
const openaiUrl = "https://api.openai.com/v1/completions";
const openaiClient = axios.create({
    headers: {
        Authorization: "Bearer " + openaiApiKey,
    },
    proxy: {
        host: "127.0.0.1",
        port: 7890,
    },
});

export async function keywordExtraction(input) {
    let prompt = `
        Extract top-5 keywords from this text, return as python array format in one line:\n
        ${input}\n
        Array:\n
    `;
    const request = {
        model: openaiModel,
        prompt: prompt,
        // messages: [
        //     {
        //         role: "system",
        //         content: prompt,
        //     },
        // ],
    };
    let result = "";
    await openaiClient.post(openaiUrl, request).then(async (response) => {
        console.log(response);
        // const answer = await response.data.choices[0].message.content;
        const answer = await response.data.choices[0].text;
        const keywords = await eval(
            "[" + answer.split("[")[1].split("]")[0] + "]"
        );
        result = keywords;
    });
    console.log(result);
    return result;
}

export async function multiLabelClassfication(text, labels) {
    let labelsArray = labels.toString();
    let prompt = `
        Labels: ${labelsArray} \n 
        Multi-labels classification (Sort the labels by how likely the text below belong to): \n 
        ${text} \n
        Classification result(as python array format in one line, the array should have all the same labels I gave you): \n
    `;
    const request = {
        model: openaiModel,
        prompt: prompt,
        // messages: [
        //     {
        //         role: "system",
        //         content: prompt,
        //     },
        // ],
    };
    let result = "";
    await openaiClient.post(openaiUrl, request).then(async (response) => {
        console.log(response);
        // const answer = await response.data.choices[0].message.content;
        const answer = await response.data.choices[0].text;
        const sortedLabels = await eval(
            "[" + answer.split("[")[1].split("]")[0] + "]"
        );
        result = sortedLabels;
    });
    console.log(result);
    return result;
}
