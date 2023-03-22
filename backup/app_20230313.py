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
    return db.readTable('interview')


@app.route("/code", methods=['GET', 'POST', 'PUT'])
def codes():
    def getCodes():
        codes = db.readTable('code')
        for code in codes:
            find_code_groups_result = db.findTable(
                'code_group', 'id', code['code_group_id'])
            code['color'] = find_code_groups_result[0]['color']
            find_usage_result = db.findTable(
                'annotation_code_merge', 'code_id', code['id'])
            code['usage'] = len(find_usage_result)
        return codes
    if request.method == 'GET':
        return getCodes()
    if request.method == 'POST':
        db.addToTable('code', request.get_json(),
                      ['name', 'owner', 'code_group_id'])
        return getCodes()
    if request.method == 'PUT':
        db.updateTableById('code', request.get_json(),
                           ['name', 'owner', 'code_group_id'])
        return getCodes()


@app.route('/code-group', methods=['GET'])
def codeGroup():
    if request.method == 'GET':
        return db.readTable('code_group')


@app.route('/paragraph', methods=['GET', 'POST', 'PUT'])
def paragraph():
    if request.method == 'GET':
        return db.readTable('paragraph')
    if request.method == 'POST':
        db.addToTable('paragraph', request.get_json(),
                      ['text', 'speaker', 'start_time', 'end_time'])
        return db.readTable('paragraph')
    if request.method == 'PUT':
        db.updateTableById('paragraph', request.get_json(), [
            'text', 'speaker', 'start_time', 'end_time'])
        return db.readTable('paragraph')


@app.route('/annotation', methods=['GET', 'POST'])
def annotation():
    def getAnnotations():
        annos = db.readTable('annotation')
        for anno in annos:
            # Nest Higlight Meta
            result = db.findTable('highlight_meta', 'id',
                                  anno['start_meta_id'])
            anno['start_meta'] = result[0]
            result = db.findTable('highlight_meta', 'id', anno['end_meta_id'])
            anno['end_meta'] = result[0]
            # Nest Code list
            anno['codes'] = []
            result = db.findTable('annotation_code_merge',
                                  'annotation_id', anno['id'])
            for item in result:
                find_code_result = db.findTable('code', 'id', item['code_id'])
                code = find_code_result[0]
                # Nest Code Group
                find_code_groups_result = db.findTable(
                    'code_group', 'id', code['code_group_id'])
                code['color'] = find_code_groups_result[0]['color']
                anno['codes'].append(code)
        annos = humps.camelize(annos)
        return annos

    if request.method == 'GET':
        return getAnnotations()

    if request.method == 'POST':
        json = request.get_json()[0]
        # Add Highlight Start Meta
        startMeta = humps.decamelize(json['startMeta'])
        startMeta['is_start'] = 1
        db.addToTable('highlight_meta', startMeta, [
            'parent_index', 'parent_tag_name', 'text_offset', 'is_start'])
        startMetaId = db.lastInsertRowId('highlight_meta')
        # Add Highlight End Meta
        endMeta = humps.decamelize(json['endMeta'])
        endMeta['is_start'] = 0
        db.addToTable('highlight_meta', endMeta, [
            'parent_index', 'parent_tag_name', 'text_offset', 'is_start'])
        endMetaId = db.lastInsertRowId('highlight_meta')
        # Add Anno
        newAnno = humps.decamelize(json)
        newAnno['start_meta_id'] = startMetaId
        newAnno['end_meta_id'] = endMetaId
        db.addToTable('annotation', newAnno, [
            'text', 'paragraph_id', 'start_meta_id', 'end_meta_id'])
        # Add Codes
        codes = humps.decamelize(json['codes'])
        annotationId = db.lastInsertRowId('annotation')
        for code in codes:
            db.addToTable('annotation_code_merge', {
                'annotation_id': annotationId, 'code_id': code['id']},
                ['annotation_id', 'code_id'])
        return getAnnotations()


@app.route('/annotation/<paragraph_id>', methods=['GET'])
def annotationById(paragraph_id):
    if request.method == 'GET':
        annos = db.findTable('annotation', 'paragraph_id', paragraph_id)
        for anno in annos:
            # Nest Higlight Meta into Anno
            result = db.findTable('highlight_meta', 'id',
                                  anno['start_meta_id'])
            anno['start_meta'] = result[0]
            result = db.findTable('highlight_meta', 'id', anno['end_meta_id'])
            anno['end_meta'] = result[0]
            # Nest Code list into Anno
            anno['codes'] = []
            result = db.findTable('annotation_code_merge',
                                  'annotation_id', anno['id'])
            for item in result:
                find_code_result = db.findTable('code', 'id', item['code_id'])
                code = find_code_result[0]
                find_code_groups_result = db.findTable(
                    'code_group', 'id', code['code_group_id'])
                code['color'] = find_code_groups_result[0]['color']
                anno['codes'].append(code)
        annos = humps.camelize(annos)
        return annos


# Enable AutoReload
if __name__ == "__main__":
    app.run(debug=True)
