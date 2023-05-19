from urllib import response
from flask import Blueprint, Response, request
nlp = Blueprint('nlp', __name__)

from transformers import pipeline

@nlp.route('/nlp/classification', methods=['POST'])
def classfication():
    input = request.get_json()['input']
    codes = request.get_json()['codes']
    model_id = './Model/multilingual-MiniLMv2-L6-mnli-xnli'
    # ------- BetterTransformer TEST: Not support DeBERTa ---------
    # from transformers import AutoModel
    # from optimum.bettertransformer import BetterTransformer
    # model = AutoModel.from_pretrained(model_id)
    # model = model.to(0)
    # model_bt = BetterTransformer.transform(model, keep_original_model=True)
    classfier = pipeline('zero-shot-classification',
                         model=model_id)
    result = classfier(input, candidate_labels=codes)
    print(result['labels'])
    return result['labels']

@nlp.route('/nlp/keyword', methods=['POST'])
def keyword():
    from keybert import KeyBERT
    import jieba
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
# ------OPENAI TEST: Cost too many token & can't align the response format-------
# def keyword_extraction_openai():
#     import os
#     from dotenv import load_dotenv
#     import openai
#     import ast
#     load_dotenv()
#     openai.api_key = os.getenv('OPENAI_API_KEY')
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
