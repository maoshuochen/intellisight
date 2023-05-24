from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from numpy import delete
from sqlalchemy import MetaData
from sqlalchemy.inspection import inspect
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import relationship
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, fields
from dotenv import load_dotenv  # python-dotenv
import humps  # pyhumps
import os
from pprint import pprint
# Custom module
from nlp import nlp

# Setup
app = Flask(__name__)
app.register_blueprint(nlp)
CORS(app)
load_dotenv()
app.config['SQLALCHEMY_DATABASE_URI'] = r'sqlite:///'+os.path.abspath('database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database to ORM
metadata = MetaData()
Base = automap_base()
with app.app_context():
    # Init database
    Base.prepare(autoload_with=db.engine)
    print(Base.classes.keys())
    Interview = Base.classes.interview
    Annotation = Base.classes.annotation
    Code = Base.classes.code
    CodeGroup = Base.classes.code_group
    Paragraph = Base.classes.paragraph
    HighlightMeta = Base.classes.highlight_meta
    Annotation_Code_Merge = Base.classes.annotation_code_merge
    # Add custom relationships
    # annotation->highlight_meta  one->many
    Annotation.start_meta = relationship(
        "highlight_meta", foreign_keys="annotation.start_meta_id", overlaps='highlight_meta,annotation_collection')
    Annotation.end_meta = relationship(
        "highlight_meta", foreign_keys="annotation.end_meta_id", overlaps='highlight_meta,annotation_collection')
    # annotation->code  many->many
    Annotation.codes = relationship(
        'code', secondary='annotation_code_merge', back_populates='annotations', overlaps='annotation,code,annotation_code_merge_collection')
    Code.annotations = relationship(
        'annotation', secondary='annotation_code_merge', back_populates='codes', overlaps='annotation,code,annotation_code_merge_collection')

# Serialization Schemas


class InterviewSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Interview
        include_relationships = False
        load_instance = True


class CodeGroupSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = CodeGroup
        include_relationships = False
        load_instance = True


class CodeSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Code
        include_relationships = False
        load_instance = True
    code_group = fields.Nested(CodeGroupSchema)
    annotations = fields.Nested(
        lambda: AnnotationSchema, many=True, exclude=['codes'])


class HighlightMetaSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = HighlightMeta
        include_relationships = False
        load_instance = True


class ParagraphSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Paragraph
        include_relationships = False
        load_instance = True


class AnnotationSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = Annotation
        include_relationships = False
        load_instance = True
    codes = fields.Nested(CodeSchema, many=True, exclude=['annotations'])
    paragraph = fields.Nested(ParagraphSchema)
    start_meta = fields.Nested(HighlightMetaSchema)
    end_meta = fields.Nested(HighlightMetaSchema)

# Custom functions


def serialization(querys, Schema):
    result = []
    for query in querys:
        dump_data = Schema().dump(query)
        result.append(humps.camelize(dump_data))
    return result


def deserialization(json, Schema):
    pprint(json)
    data = humps.decamelize(json)
    object = Schema().load(data, session=db.session)
    return object


def query_all(Table, Schema):
    querys = db.session.query(Table).all()
    return serialization(querys, Schema)


def query_last_row(Table, Schema):
    query_last_row = db.session.query(Table).order_by(
        Table.id.desc()).first()
    dump_data = Schema().dump(query_last_row)
    return humps.camelize(dump_data)


# API Endpoints
@app.route("/interview", methods=['GET', 'POST'])
def interview():
    if request.method == 'GET':
        return query_all(Interview, InterviewSchema)


@app.route("/paragraph", methods=['GET', 'POST'])
def paragraph():
    if request.method == 'GET':
        return query_all(Paragraph, ParagraphSchema)
    if request.method == 'POST':
        new_paragraph = deserialization(request.get_json(), ParagraphSchema)
        db.session.add(new_paragraph)
        db.session.commit()
        return query_all(Paragraph, ParagraphSchema)


@app.route('/code-group', methods=['GET', 'POST'])
def code_group():
    if request.method == 'GET':
        return query_all(CodeGroup, CodeGroupSchema)
    if request.method == 'POST':
        new_group = deserialization(request.get_json(), CodeGroupSchema)
        db.session.add(new_group)
        db.session.commit()
        return query_all(CodeGroup, CodeGroupSchema)


@app.route('/code_group/<code_group_id>', methods=['PUT', 'DELETE'])
def code_group_by_id(code_group_id):
    if request.method == 'PUT':
        new_code_group = deserialization(request.get_json(), CodeGroupSchema)
        old_code_group = db.session.query(
            CodeGroup).filter_by(id=str(code_group_id))
        # Change Color Property
        old_code_group.color = new_code_group.color
        db.session.commit()
        return query_all(CodeGroup, CodeGroupSchema)


@app.route("/code", methods=['GET', 'POST'])
def code():
    if request.method == 'GET':
        return query_all(Code, CodeSchema)
    if request.method == 'POST':
        new_code = deserialization(request.get_json(), CodeSchema)
        db.session.add(new_code)
        db.session.commit()
        return query_all(Code, CodeSchema)


@app.route("/code/<code_id>", methods=['PUT', 'DELETE'])
def code_by_id(code_id):
    if request.method == 'PUT':
        new_code = deserialization(request.get_json(), CodeSchema)
        old_code = db.session.query(Code).filter_by(id=str(code_id)).first()
        old_code.code_group = new_code.code_group
        old_code.name = new_code.name
        db.session.commit()
        return query_all(Code, CodeSchema)
    if request.method == 'DELETE':
        delete_code = db.session.query(Code).filter_by(id=str(code_id)).first()
        db.session.delete(delete_code)
        db.session.commit()
        return query_all(Code, CodeSchema)


@app.route('/annotation', methods=['GET', 'POST'])
def annotation():
    if request.method == 'GET':
        if (request.args.get('paragraph-id')):
            # url: /annotation?paragraph-id=
            paragraph_id = request.args.get('paragraph-id')
            querys = db.session.query(Annotation).filter_by(
                paragraph_id=str(paragraph_id))
            return serialization(querys, AnnotationSchema)
        else:
            return query_all(Annotation, AnnotationSchema)
    if request.method == 'POST':
        json = request.get_json()
        # insert start_meta
        json['startMeta']['is_start'] = 1
        start_meta = deserialization(json['startMeta'], HighlightMetaSchema)
        db.session.add(start_meta)
        db.session.commit()
        json['startMeta'] = query_last_row(HighlightMeta, HighlightMetaSchema)
        # insert end_meta
        json['endMeta']['is_start'] = 0
        end_meta = deserialization(json['endMeta'], HighlightMetaSchema)
        db.session.add(end_meta)
        db.session.commit()
        json['endMeta'] = query_last_row(HighlightMeta, HighlightMetaSchema)
        # insert annotation
        annotation = deserialization(json, AnnotationSchema)
        db.session.add(annotation)
        db.session.commit()
        return query_all(Annotation, AnnotationSchema)


@app.route('/annotation/<annotation_id>', methods=['PUT', 'DELETE'])
def annotation_by_id(annotation_id):
    if request.method == 'PUT':
        new_annotation = deserialization(request.get_json(), AnnotationSchema)
        old_annotation = db.session.query(
            Annotation).filter_by(id=str(annotation_id))
        # Change Codes Property
        old_annotation.codes = new_annotation.codes
        db.session.commit()
        return query_all(Annotation, AnnotationSchema)
    if request.method == 'DELETE':
        delete_annotation = db.session.query(
            Annotation).filter_by(id=str(annotation_id))
        db.session.delete(delete_annotation)
        db.session.commit()
        return query_all(Annotation, AnnotationSchema)


@app.route('/highlight-meta', methods=['GET', 'POST'])
def highlight_meta():
    if request.method == 'GET':
        return query_all(HighlightMeta, HighlightMetaSchema)
    if request.method == 'POST':
        new_highlight_meta = deserialization(
            request.get_json(), HighlightMetaSchema)
        db.session.add(new_highlight_meta)
        db.session.commit()
        return query_last_row(HighlightMeta, HighlightMetaSchema)


# Enable AutoReload
if __name__ == "__main__":
    import jieba
    jieba.initialize()
    app.run(debug=True)

    
