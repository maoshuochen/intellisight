from requests import session
from sqlalchemy.ext.automap import automap_base
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import Session
metadata = MetaData()

engine = create_engine('sqlite:///database.db')
Base = automap_base()
Base.prepare(autoload_with=engine)
Base.classes.keys()
session = Session(engine)

Annotation = Base.classes.annotation
Code = Base.classes.code


def get_all_annotations():
    for anno in session.query(Annotation).limit(10):
        print(anno.text)
