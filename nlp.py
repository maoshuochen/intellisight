from flask import Blueprint, request
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
    model = KeyBERT(model="./Model/text2vec-base-chinese")
    keywords = model.extract_keywords(input)
    result = []
    for keyword in keywords:
        if keyword[1] > 0.2:
            result.append(keyword[0])
    print(result)
    return result

