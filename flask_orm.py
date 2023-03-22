from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import relationship
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema, fields
from pprint import pprint
from dotenv import load_dotenv
import humps  # pyhumps
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///'+os.getenv('DATABASE_PATH')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


metadata = MetaData()
Base = automap_base()
with app.app_context():
    Base.prepare(autoload_with=db.engine)
    print(Base.classes.keys())
    Interview = Base.classes.interview
    Annotation = Base.classes.annotation
    Code = Base.classes.code
    CodeGroup = Base.classes.code_group
    Paragraph = Base.classes.paragraph
    HighlightMeta = Base.classes.highlight_meta
    # Add custom relationships after calling prepare method
    Annotation.start_meta = relationship(
        "highlight_meta", foreign_keys="annotation.start_meta_id")
    Annotation.end_meta = relationship(
        "highlight_meta", foreign_keys="annotation.end_meta_id")


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
        include_relationships = True
        load_instance = True
    paragraph = fields.Nested(ParagraphSchema)
    start_meta = fields.Nested(HighlightMetaSchema)
    end_meta = fields.Nested(HighlightMetaSchema)


def get_all(Table, Schema):
    result = []
    querys = db.session.query(Table).all()
    for query in querys:
        dump_data = Schema().dump(query)
        result.append(humps.camelize(dump_data))
    return result


@app.route("/interview", methods=['GET', 'POST', 'PUT'])
def interview():
    if request.method == 'GET':
        return get_all(Interview, InterviewSchema)


@app.route("/paragraph", methods=['GET', 'POST', 'PUT'])
def paragraph():
    if request.method == 'GET':
        return get_all(Paragraph, ParagraphSchema)


@app.route("/code", methods=['GET', 'POST', 'PUT'])
def code():
    if request.method == 'GET':
        return get_all(Code, CodeSchema)


@app.route('/annotation', methods=['GET', 'POST'])
def annotation():
    if request.method == 'GET':
        return get_all(Annotation, AnnotationSchema)
    if request.method == 'POST':
        pass


@app.route('/code-group', methods=['GET', 'POST'])
def code_group():
    if request.method == 'GET':
        return get_all(CodeGroup, CodeGroupSchema)
    if request.method == 'POST':
        pass


# Enable AutoReload
if __name__ == "__main__":
    app.run(debug=True)
