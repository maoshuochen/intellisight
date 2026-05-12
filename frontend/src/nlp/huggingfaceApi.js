import axios from "axios";
import { store } from "/src/store.js";

const client = axios.create({
    headers: {
        Authorization: `Bearer ${import.meta.env.VITE_HUGGING_FACE_API_KEY}`,
    },
});

export async function keywordExtraction(input) {
    let request = {
        data: [input],
    };
    let output;
    await client.post(store.url.keywordExtraction, request).then((response) => {
        console.log(response);
        output = eval(response.data.data[0]);
    });
    return output;
}

export async function classification(text, labels) {
    let request = {
        wait_for_model: true,
        inputs: text,
        parameters: {
            candidate_labels: labels,
        },
    };
    console.log(request);
    let output;
    await client.post(store.url.classification, request).then((response) => {
        console.log(response);
        output = response.data.labels;
    });
    return output;
}
