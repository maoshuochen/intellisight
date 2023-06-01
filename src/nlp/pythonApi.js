import axios from "axios";
const url = "http://localhost:5000/nlp/";

export async function keywordExtraction(input) {
    let keywordUrl = url + "keyword";
    let request = { input: input };
    let result;
    await axios.post(keywordUrl, request).then(async (response) => {
        console.log(response);
        result = response.data;
    });
    return result;
}

export async function classification(text, labels) {
    let classificationUrl = url + "classification";
    let request = { input: text, codes: labels };
    let result;
    await axios.post(classificationUrl, request).then(async (response) => {
        console.log(response);
        result = response.data;
    });
    return result;
}
