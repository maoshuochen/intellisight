# TODO:
# Use openai to replace NLP function

from urllib import response
from flask import Blueprint, Response, request
from keybert import KeyBERT
import jieba
from transformers import pipeline

import os
from dotenv import load_dotenv  # python-dotenv
import openai
import ast

nlp = Blueprint('nlp', __name__)

load_dotenv()
openai.api_key = os.getenv('OPENAI_API_KEY')

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
# ------OPENAI TEST-------
# def keyword_extraction_openai():
#     input = request.get_json()['input']
#     response = openai.Completion.create(
#         model="text-davinci-003",
#         prompt="Extract top-5 keywords from this text, return as python array format:\n"+input,
#         temperature=0.5,
#         max_tokens=60,
#         top_p=1.0,
#         frequency_penalty=0.8,
#         presence_penalty=0.0,
#         )
#     print(response)
#     answer = response.choices[0].text.split('[')[1].split(']')[0]
#     keywords = ast.literal_eval('['+answer+']')
#     return keywords
