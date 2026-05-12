from flask import Blueprint, request
import os
nlp = Blueprint('nlp', __name__)

from transformers import pipeline

@nlp.route('/nlp/classification', methods=['POST'])
def classfication():
    # handle input
    input = request.get_json()['input']
    codes = request.get_json()['codes']
    # model
    model_local_id = './Model/multilingual-MiniLMv2-L6-mnli-xnli'
    model_net_id='MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli'
    if(os.path.exists(model_local_id)):
        classfier = pipeline('zero-shot-classification',
                            model=model_local_id)
    else: 
        classfier = pipeline('zero-shot-classification',
                            model=model_net_id)
    # predict
    result = classfier(input, candidate_labels=codes)
    print(result['labels'])
    return result['labels']

@nlp.route('/nlp/keyword', methods=['POST'])
def keyword():
    from keybert import KeyBERT
    import jieba
    input = request.get_json()['input']
    input = " ".join(jieba.cut(input))
    # model
    model_local_id="./Model/paraphrase-multilingual-MiniLM-L12-v2"
    model_net_id="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    if(os.path.exists(model_local_id)):
        model = KeyBERT(model=model_local_id)
    else:
        model = KeyBERT(model=model_net_id)
    # predict
    keywords = model.extract_keywords(input)
    result = []
    for keyword in keywords:
        if keyword[1] > 0.2:
            result.append(keyword[0])
    print(result)
    return result

