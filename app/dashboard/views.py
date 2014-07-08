import json, flask_login, datetime

import flask

import mediacloud.api as mcapi
from app.core import flapp, mc_key, mc
import app.core.views

_sentence_export_props = ['date','numFound']
_sentence_export_columns = ['date','sentences']
_wordcount_export_props = ['term','stem','count']

@flapp.route('/api/demo/sentences/numfound/<keywords>/csv')
def demo_sentence_numfound_csv(keywords):
    media, start, end = app.core.views.demo_params()
    try:
        results = json.loads(app.core.views._sentence_numfound(mc_key, keywords, media, start, end))
        return _assemble_csv_response(results, _sentence_export_props, _sentence_export_columns,'demo-sentence-counts')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def sentence_numfound_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    app.core.logger.debug("sentence_numfound_csv: %s %s %s %s", (keywords,media,start,end))
    try:
        results = json.loads(app.core.views._sentence_numfound(api_key, keywords, media, start, end))
        return _assemble_csv_response(results, _sentence_export_props, _sentence_export_columns,'sentence-counts')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _assemble_csv_response(results,properties,column_names,filename):
    # stream back a csv
    def stream_csv(data,props,names):
        yield ','.join(names) + '\n'
        for row in data:
            attr = [ str(row[p]) for p in props]
            yield ','.join(attr) + '\n'
    download_filename = 'mediacloud-'+str(filename)+'-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')+'.csv'
    return flask.Response(stream_csv(results,properties,column_names), mimetype='text/csv', 
                headers={"Content-Disposition":"attachment;filename="+download_filename})

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def wordcount_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    user_mc = mcapi.MediaCloud(api_key)
    try:
        results = json.loads(app.core.views._wordcount(user_mc, keywords, media, start, end))
        return _assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props,'wordcount')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/wordcount/<keywords>/csv')
def demo_wordcount_csv(keywords):
    media, start, end = app.core.views.demo_params()
    try:
        results = json.loads(app.core.views._wordcount(mc, keywords, media, start, end))
        return _assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props,'demo-wordcount')
    except Exception as exception:
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400
