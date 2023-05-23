import axios from "axios";

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
    await client
        .post("https://maoshuochen-keybert.hf.space/api/predict", request)
        .then((response) => {
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
    await client
        .post(
            "https://api-inference.huggingface.co/models/MoritzLaurer/ernie-m-base-mnli-xnli",
            request
        )
        .then((response) => {
            console.log(response);
            output = response.data;
        });
    return output;
}
