from flask import Blueprint, request
from keybert import KeyBERT
import jieba
from transformers import pipeline

nlp = Blueprint('nlp', __name__)


@nlp.route('/nlp/classification', methods=['POST'])
def classfication():
    input = request.get_json()['input']
    codes = request.get_json()['codes']
    model = './Model/multilingual-MiniLMv2-L6-mnli-xnli'
    classfier = pipeline('zero-shot-classification',
                         model=model)
    result = classfier(input, candidate_labels=codes)
    print(result['labels'])
    return result['labels']


@nlp.route('/nlp/keyword', methods=['POST'])
def keyword():
    input = request.get_json()['input']
    input = " ".join(jieba.cut(input))
    model = KeyBERT(model="./Model/paraphrase-multilingual-MiniLM-L12-v2")
    keywords = model.extract_keywords(input)
    result = []
    for keyword in keywords:
        if keyword[1] > 0.2:
            result.append(keyword[0])
    print(result)
    return result
