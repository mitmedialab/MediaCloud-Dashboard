import json, flask_login

from flask import make_response, Response

import mediacloud.api as mcapi
from app.core import flapp, mc_key, mc
import app.core.views

_sentence_export_props = ['date','numFound']
_sentence_export_columns = ['date','sentences']
_wordcount_export_props = ['term','stem','count']

@flapp.route('/api/demo/sentences/numfound/<keywords>/csv')
def demo_sentence_numfound_csv(keywords):
    media, start, end = app.core.views.demo_params()
    results = json.loads(app.core.views._sentence_numfound(mc_key, keywords, media, start, end))
    return _assemble_csv_response(results, _sentence_export_props, _sentence_export_columns)

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def sentence_numfound_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    app.core.logger.debug("sentence_numfound_csv: %s %s %s %s", (keywords,media,start,end))
    results = json.loads(app.core.views._sentence_numfound(api_key, keywords, media, start, end))
    return _assemble_csv_response(results, _sentence_export_props, _sentence_export_columns)

def _assemble_csv_response(results,properties,column_names):
    rows = []
    rows.append( column_names )
    for res in results:
        row = []
        for p in properties:
            row.append( str(res[p]) )
        rows.append(row)
    # stream back a csv
    def generate_csv():
        for row in rows:
            yield ",".join(row)+"\n"
    return Response(generate_csv(), mimetype="text/csv")

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def wordcount_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    user_mc = mcapi.MediaCloud(api_key)
    results = json.loads(app.core.views._wordcount(user_mc, keywords, media, start, end))
    return _assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props)

@flapp.route('/api/demo/wordcount/<keywords>/csv')
def demo_wordcount_csv(keywords):
    media, start, end = app.core.views.demo_params()
    results = json.loads(app.core.views._wordcount(mc, keywords, media, start, end))
    return _assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props)
