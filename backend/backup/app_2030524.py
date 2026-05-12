from flask import Flask, request
from flask_cors import CORS
import humps  # pyhumps
import database as db
from nlp import nlp

app = Flask(__name__)
app.register_blueprint(nlp)
CORS(app)

# Endpoint


@app.route("/")
def index():
    return "index"


@app.route('/interview', methods=['GET'])
def interview():
    return db.query_all('interview')


@app.route("/code", methods=['GET', 'POST', 'PUT'])
def codes():
    def get_all_codes():
        codes = db.query_all('code')
        for code in codes:
            find_code_groups_result = db.query_by_key(
                'code_group', 'id', code['code_group_id'])
            code['color'] = find_code_groups_result[0]['color']
            find_usage_result = db.query_by_key(
                'annotation_code_merge', 'code_id', code['id'])
            code['usage'] = len(find_usage_result)
        return codes
    if request.method == 'GET':
        return get_all_codes()
    if request.method == 'POST':
        db.insert_row('code', request.get_json(),
                      ['name', 'owner', 'code_group_id'])
        return get_all_codes()
    if request.method == 'PUT':
        db.update_by_id('code', request.get_json(),
                        ['name', 'owner', 'code_group_id'])
        return get_all_codes()


@app.route('/code-group', methods=['GET'])
def code_group():
    if request.method == 'GET':
        return db.query_all('code_group')


@app.route('/paragraph', methods=['GET', 'POST', 'PUT'])
def paragraph():
    if request.method == 'GET':
        return db.query_all('paragraph')
    if request.method == 'POST':
        db.insert_row('paragraph', request.get_json(),
                      ['text', 'speaker', 'start_time', 'end_time'])
        return db.query_all('paragraph')
    if request.method == 'PUT':
        db.update_by_id('paragraph', request.get_json(), [
            'text', 'speaker', 'start_time', 'end_time'])
        return db.query_all('paragraph')


@app.route('/annotation', methods=['GET', 'POST'])
def annotation():
    def get_all_annotations():
        annos = db.query_all('annotation')
        for anno in annos:
            # Nest Higlight Meta
            result = db.query_by_key('highlight_meta', 'id',
                                     anno['start_meta_id'])
            anno['start_meta'] = result[0]
            result = db.query_by_key(
                'highlight_meta', 'id', anno['end_meta_id'])
            anno['end_meta'] = result[0]
            # Nest Code list
            anno['codes'] = []
            result = db.query_by_key('annotation_code_merge',
                                     'annotation_id', anno['id'])
            for item in result:
                find_code_result = db.query_by_key(
                    'code', 'id', item['code_id'])
                code = find_code_result[0]
                # Nest Code Group
                find_code_groups_result = db.query_by_key(
                    'code_group', 'id', code['code_group_id'])
                code['color'] = find_code_groups_result[0]['color']
                anno['codes'].append(code)
        annos = humps.camelize(annos)
        return annos

    if request.method == 'GET':
        return get_all_annotations()

    if request.method == 'POST':
        json = request.get_json()[0]
        # Add Highlight Start Meta
        startMeta = humps.decamelize(json['startMeta'])
        startMeta['is_start'] = 1
        db.insert_row('highlight_meta', startMeta, [
            'parent_index', 'parent_tag_name', 'text_offset', 'is_start'])
        startMetaId = db.get_last_insert_id('highlight_meta')
        # Add Highlight End Meta
        endMeta = humps.decamelize(json['endMeta'])
        endMeta['is_start'] = 0
        db.insert_row('highlight_meta', endMeta, [
            'parent_index', 'parent_tag_name', 'text_offset', 'is_start'])
        endMetaId = db.get_last_insert_id('highlight_meta')
        # Add Anno
        newAnno = humps.decamelize(json)
        newAnno['start_meta_id'] = startMetaId
        newAnno['end_meta_id'] = endMetaId
        db.insert_row('annotation', newAnno, [
            'text', 'paragraph_id', 'start_meta_id', 'end_meta_id'])
        # Add Codes
        codes = humps.decamelize(json['codes'])
        annotationId = db.get_last_insert_id('annotation')
        for code in codes:
            db.insert_row('annotation_code_merge', {
                'annotation_id': annotationId, 'code_id': code['id']},
                ['annotation_id', 'code_id'])
        return get_all_annotations()


@app.route('/annotation/<paragraph_id>', methods=['GET'])
def annotationById(paragraph_id):
    if request.method == 'GET':
        annos = db.query_by_key('annotation', 'paragraph_id', paragraph_id)
        for anno in annos:
            # Nest Higlight Meta into Anno
            result = db.query_by_key('highlight_meta', 'id',
                                     anno['start_meta_id'])
            anno['start_meta'] = result[0]
            result = db.query_by_key(
                'highlight_meta', 'id', anno['end_meta_id'])
            anno['end_meta'] = result[0]
            # Nest Code list into Anno
            anno['codes'] = []
            result = db.query_by_key('annotation_code_merge',
                                     'annotation_id', anno['id'])
            for item in result:
                find_code_result = db.query_by_key(
                    'code', 'id', item['code_id'])
                code = find_code_result[0]
                find_code_groups_result = db.query_by_key(
                    'code_group', 'id', code['code_group_id'])
                code['color'] = find_code_groups_result[0]['color']
                anno['codes'].append(code)
        annos = humps.camelize(annos)
        return annos


# Enable AutoReload
if __name__ == "__main__":
    app.run(debug=True)
