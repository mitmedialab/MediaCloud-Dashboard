import json, flask_login

from flask import make_response, Response

from app.core import flapp, mc_key
import app.core.views

@flapp.route('/api/demo/sentences/numfound/<keywords>/csv')
def demo_sentence_numfound_csv(keywords):
    media, start, end = app.core.views.demo_params()
    results = json.loads(app.core.views._sentence_numfound(mc_key, keywords, media, start, end))
    return _sentence_numfound_csv_response(results)

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def sentence_numfound_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    app.core.logger.debug("sentence_numfound_csv: %s %s %s %s", (keywords,media,start,end))
    results = json.loads(app.core.views._sentence_numfound(api_key, keywords, media, start, end))
    return _sentence_numfound_csv_response(results)

def _sentence_numfound_csv_response(results):
    properties = ['date','numFound']
    rows = []
    rows.append( ['date','sentences'] )
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