from flask import Blueprint, request
from transformers import pipeline
import clueai  # https://www.clueai.cn/admin/api
from dotenv import load_dotenv
import os


load_dotenv()
nlp = Blueprint('nlp', __name__)
cl = clueai.Client(os.getenv('CLUEAI_TOKEN'))


@nlp.route('/predict/classify', methods=['POST'])
def classify():
    input = request.get_json()['input']
    codes = request.get_json()['codes']
    response = cl.classify(
        model_name='clueai-large',
        inputs=[input],
        labels=codes)
    labels = []
    for confidence in response.classifications[0].confidence:
        print(format(confidence))
        label = {"label": confidence.label,
                 'confidence': confidence.confidence}
        labels.append(label)

    def get_confidence(label):
        return label['confidence']
    labels.sort(key=get_confidence, reverse=True)
    print(labels)
    return labels


@nlp.route('/nlp/classification', methods=['POST'])
def classfication():
    input = request.get_json()['input']
    codes = request.get_json()['codes']
    model = './Model/multilingual-MiniLMv2-L6-mnli-xnli'
    # model = torch.compile(model)
    classfier = pipeline('zero-shot-classification',
                         model=model)
    result = classfier(input, candidate_labels=codes)
    print(result['labels'])
    return result['labels']
