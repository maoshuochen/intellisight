from unittest import result
from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import relationship
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, fields
from pprint import pprint
from dotenv import load_dotenv
import os
import humps  # pyhumps
# custom
from nlp import nlp


load_dotenv()

app = Flask(__name__)
app.register_blueprint(nlp)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///'+os.getenv('DATABASE_PATH')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


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
    # Add custom relationships
    # annotation-to-highlight_meta  one-to-many
    Annotation.start_meta = relationship(
        "highlight_meta", foreign_keys="annotation.start_meta_id", overlaps='highlight_meta,annotation_collection')
    Annotation.end_meta = relationship(
        "highlight_meta", foreign_keys="annotation.end_meta_id", overlaps='highlight_meta,annotation_collection')
    # annotation-to-code  many-to-many
    Annotation.codes = relationship(
        'code', secondary='annotation_code_merge', back_populates='annotations', overlaps='annotation,code,annotation_code_merge_collection')
    Code.annotations = relationship(
        'annotation', secondary='annotation_code_merge', back_populates='codes', overlaps='annotation,code,annotation_code_merge_collection')

# Schemas


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
        lambda: AnnotationSchema(exclude=('codes',)), many=True)


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
    codes = fields.Nested(CodeSchema(exclude=('annotations',)), many=True)
    paragraph = fields.Nested(ParagraphSchema)
    start_meta = fields.Nested(HighlightMetaSchema)
    end_meta = fields.Nested(HighlightMetaSchema)


def serialization(querys, Schema):
    result = []
    for query in querys:
        dump_data = Schema().dump(query)
        result.append(humps.camelize(dump_data))
    return result


def query_all(Table, Schema):
    querys = db.session.query(Table).all()
    return serialization(querys, Schema)


# Endpoints
@app.route("/interview", methods=['GET', 'POST', 'PUT'])
def interview():
    if request.method == 'GET':
        return query_all(Interview, InterviewSchema)


@app.route("/paragraph", methods=['GET', 'POST', 'PUT'])
def paragraph():
    if request.method == 'GET':
        return query_all(Paragraph, ParagraphSchema)


@app.route("/code", methods=['GET', 'POST', 'PUT'])
def code():
    if request.method == 'GET':
        return query_all(Code, CodeSchema)


@app.route('/annotation', methods=['GET', 'POST'])
def annotation():
    if request.method == 'GET':
        return query_all(Annotation, AnnotationSchema)
    if request.method == 'POST':
        pass


@app.route('/annotation/<paragraph_id>', methods=['GET'])
def annotationByParagraphId(paragraph_id):
    if request.method == 'GET':
        querys = db.session.query(Annotation).filter_by(
            paragraph_id=str(paragraph_id))
        return serialization(querys, AnnotationSchema)


@app.route('/code-group', methods=['GET', 'POST'])
def code_group():
    if request.method == 'GET':
        return query_all(CodeGroup, CodeGroupSchema)
    if request.method == 'POST':
        pass


# Enable AutoReload
if __name__ == "__main__":
    app.run(debug=True)
