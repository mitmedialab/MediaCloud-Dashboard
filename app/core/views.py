import datetime, json, logging, traceback, sys
from random import randint
from operator import itemgetter

import flask
import flask_login
import mediacloud
import mediacloud.api as mcapi
import mediacloud.error as mcerror
import pymongo

from app.core import config, flapp, login_manager, mc, mc_key, db
import app.core.util
import authentication
from forms import *

@flapp.route('/')
def index():
    content = flask.render_template('core/progress.html')
    template = config.get('flask', 'template')
    return flask.render_template(
        template
        , content=content
        , google_analytics_id=config.get('analytics', 'google_analytics_id')
    )

# -----------------------------------------------------------------------------------------
# USER MGMT -------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/login', methods=['POST'])
def login():
    if flask_login.current_user.is_authenticated():
        app.core.logger.debug("login: user logged in already")
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
            , 'key': flask_login.current_user.get_id()
            , 'sentencesAllowed': _sentences_allowed(flask_login.current_user.get_id())
        }
        return json.dumps(response)
    # User is attempting new login, authenticate
    username = ''
    password = ''
    key = ''
    try:
        username = flask.request.form['username']
        password = flask.request.form['password']
        app.core.logger.debug("login: user "+username+" trying to login")
        user = authentication.authenticate_by_password(username, password)
    except KeyError:
        try:
            username = flask.request.form['username']
            key = flask.request.form['key']
            user = authentication.authenticate_by_key(username, key)
        except KeyError:
            pass
    if not user.is_authenticated():
        flask.abort(401)
    flask_login.login_user(user)
    user.create_in_db_if_needed()
    response = {
        'username': username
        , 'authenticated': True
        , 'anonymous': False
        , 'key': user.get_id()
        , 'sentencesAllowed': _sentences_allowed(user.get_id())
    }
    app.core.logger.debug("login: successful login for %s" % user.name)
    return json.dumps(response)

@flapp.route('/api/user', methods=['POST'])
def user():
    if flask_login.current_user.is_authenticated():
        # User is already logged in, confirm by sending user object
        response = {
            'username': flask_login.current_user.name
            , 'authenticated': True
            , 'anonymous': False
            , 'key': flask_login.current_user.get_id()
            , 'sentencesAllowed': _sentences_allowed(flask_login.current_user.get_id())
        }
        return json.dumps(response)
    flask.abort(401)

@flapp.route('/api/logout', methods=['POST'])
@flask_login.login_required
def logout():
    app.core.logger.debug("logout")
    flask_login.logout_user()
    response = {
        'username': ''
        , 'authenticated': False
        , 'key': ''
    }
    return json.dumps(response)

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    return authentication.User.get(userid)

@flapp.route('/api/queries/<query_timestamp>', methods=['PUT','DELETE'])
@flask_login.login_required
def manage_query(query_timestamp):
    if flask.request.method == 'PUT':
        data = flask.request.get_json()
        db.users.update(
            { 'username': flask_login.current_user.name },
            { '$push': { 'saved_queries': data } }
        )
        app.core.logger.debug("saved query with timestamp %s" % query_timestamp)
        return json.dumps({'status':'success'})
    elif flask.request.method == 'DELETE':
        # for some reason this doesn't work
        #db.users.update(
        #    { 'username': flask_login.current_user.name },
        #    { '$pull': { 
        #        'saved_queries': {'timestamp': query_timestamp}
        #    } }
        #)
        # HACK:
        db_user = authentication.load_from_db_by_username(flask_login.current_user.name)
        if 'saved_queries' in db_user:
            idx = None
            i = 0
            for q in db_user['saved_queries']:
                app.core.logger.debug(q['timestamp'])
                if str(q['timestamp']) == query_timestamp:
                    idx = i
                i = i + 1
            app.core.logger.debug(idx)
            if idx is not None:
                del db_user['saved_queries'][idx]
                db.users.save(db_user)
                return json.dumps({'status':'success'})
            else: 
                return json.dumps({'error':'saved search not found'}), 400
    else:
        return json.dumps({'error':'unsupported http method'}), 400

@flapp.route('/api/queries/list')
@flask_login.login_required
def list_saved_queries():
    db_user = authentication.load_from_db_by_username(flask_login.current_user.name)
    queries = []
    if 'saved_queries' in db_user:
        queries = db_user['saved_queries']
    queries.sort(key=itemgetter("timestamp"), reverse=True) # return most recent first on list
    return json.dumps(queries)

# -----------------------------------------------------------------------------------------
# MEDIA -----------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/media')
@flask_login.login_required
def media():
    return json.dumps({'sets':app.core.util.all_media_sets()}, separators=(',',':'));

@flapp.route('/api/media/sources/search/<str>')
@flask_login.login_required
def media_search(str):
    return json.dumps(mc.mediaList(name_like=str))

@flapp.route('/api/media/sources')
@flask_login.login_required
def media_sources():
    return json.dumps(list(app.core.util.all_media_sources()), separators=(',',':'))

@flapp.route('/api/media/sets')
@flask_login.login_required
def media_sets():
    return json.dumps(list(app.core.util.all_media_sets()), separators=(',',':'))

@flapp.route('/api/media/sources/single/<media_id>')
@flask_login.login_required
def media_single_source(media_id):
    return json.dumps(mc.media(media_id))

@flapp.route('/api/media/tags/single/<tags_id>')
@flask_login.login_required
def media_single_tags(tags_id):
    return json.dumps(mc.tag(tags_id))

@flapp.route('/api/media/tags/search/<query>')
@flask_login.login_required
def media_search_tags(query):
    return json.dumps(mc.tagList(name_like=query,public_only=True))

# -----------------------------------------------------------------------------------------
# SENTENCES -------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

@flapp.route('/api/query/solr/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def solr_query(keywords, media, start, end):
    solr_query = app.core.util.solr_query(keywords, media, start, end)
    return json.dumps({'queryText':solr_query})

@flapp.route('/api/sentences/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentences(keywords, media, start, end):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: sentences %s" % query)
    try:
        res = mc.sentenceList(query, '', 0, 10)
        return json.dumps(res, separators=(',',':'))
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _sentence_docs(api, keywords, media, start, end, count=10, sort=mcapi.MediaCloud.SORT_RANDOM):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _sentence_docs %s" % query)
    start_index = 0
    if sort==mcapi.MediaCloud.SORT_RANDOM :
        # to sort radomly, we need to offset into the results and set sort to random
        # so first we need to know how many senteces there are
        sentence_counts = json.loads(_sentence_numfound(api._auth_token, keywords, media, start, end))
        sentence_total = sum([day['numFound'] for day in sentence_counts])
        sentence_total = min(sentence_total,5000)   # don't offset too far into results otherwise query takes a LONG time to return
        try:
            start_index = randint(0,sentence_total-count)
        except Exception as exception:
            start_index = 0
    res = api.sentenceList(query, '', start_index, count, sort=sort)
    sentences = res['response']['docs']
    for s in sentences:
        s['totalSentences'] = res['response']['numFound'] # hack to get total sentences count to Backbone.js
    return json.dumps(sentences, separators=(',',':'))

@flapp.route('/api/sentences/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_docs(keywords, media, start, end):
    try:
        return _sentence_docs(mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/docs/<keywords>')
def demo_sentence_docs(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_docs(mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

def _sentence_numfound(api_key, keywords, media, start, end):
    user_mc = mcapi.MediaCloud(api_key)
    query_args = []
    kw = app.core.util.keywords_to_solr(keywords)
    if len(kw.strip()) > 0:
        query_args.append(kw)
    app.core.logger.debug('MEDIA ' + media)
    if app.core.util.media_is_specified(media):
        query_args.append( app.core.util.media_to_solr(media) )
    query = " AND ".join(query_args)
    app.core.logger.debug("query: _sentence_numfound: %s" % query)
    if app.core.util.no_date_specified(start,end):  # HACK: if no date, just return last year
        start = (datetime.datetime.now() - datetime.timedelta(days=365)).strftime('%Y-%m-%d')
        end = datetime.datetime.now().strftime('%Y-%m-%d')
    else:
        start = datetime.datetime.strptime(start, '%Y-%m-%d').strftime('%Y-%m-%d')
        end = (datetime.datetime.strptime(end, '%Y-%m-%d')+datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    response = user_mc.sentenceCount(query, solr_filter='', split=True, split_daily=False, split_start_date=start, split_end_date=end)
    del response['split']['gap']
    del response['split']['start']
    del response['split']['end']
    date_counts = []
    for date, num_found in response['split'].iteritems():
        date_counts.append({
            "date": date[:10]
            , "numFound": num_found
        })
    date_counts = sorted(date_counts, key=lambda d: datetime.datetime.strptime(d["date"], "%Y-%m-%d"))
    return json.dumps(date_counts, separators=(',',':'))

@flapp.route('/api/sentences/numfound/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def sentence_numfound(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    app.core.logger.debug("request: /api/sentences/numfound/")
    try:
        return _sentence_numfound(api_key, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/sentences/numfound/<keywords>')
def demo_sentence_numfound(keywords):
    media, start, end = demo_params()
    try:
        return _sentence_numfound(mc_key, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

# -----------------------------------------------------------------------------------------
# STORIES ---------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _story_public_docs(api, keywords, media, start, end, count=10):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _story_docs %s" % query)
    stories = api.storyPublicList(query,rows=count)
    # now add in the titles by calling the private API
    for s in stories:
        s['title']=mc.story(s['stories_id'])['title']
    return json.dumps(stories, separators=(',',':'))
    
@flapp.route('/api/stories/public/docs/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def story_public_docs(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    try:
        return _story_public_docs(user_mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/stories/docs/<keywords>')
def demo_story_docs(keywords):
    media, start, end = demo_params()
    try:
        return _story_public_docs(mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

# -----------------------------------------------------------------------------------------
# WORD COUNTS -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _wordcount(api, keywords, media, start, end):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _wordcount: %s" % query)
    res = api.wordCount(query)
    return json.dumps(res, separators=(',',':'))

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def wordcount(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    try:
        return _wordcount(user_mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/demo/wordcount/<keywords>')
def demo_wordcount(keywords):
    media, start, end = demo_params()
    try:
        return _wordcount(mc, keywords, media, start, end)
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

_wordcount_export_props = ['term','stem','count']   # pass these into _assemble_csv_response as the properties arg

@flapp.route('/api/wordcount/<keywords>/<media>/<start>/<end>/csv')
@flask_login.login_required
def wordcount_csv(keywords, media, start, end):
    api_key = flask_login.current_user.get_id()
    user_mc = mcapi.MediaCloud(api_key)
    try:
        results = json.loads(app.core.views._wordcount(user_mc, keywords, media, start, end))
        return assemble_csv_response(results,_wordcount_export_props,_wordcount_export_props,'wordcount')
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/export/svg', methods=['POST'])
def export_svg():
    response = flapp.make_response(flask.request.form['content'])
    disposition = "attachment; filename=%s" % flask.request.form['filename']
    response.headers["Content-Disposition"] = disposition
    return response

# -----------------------------------------------------------------------------------------
# GEOGRAPHY -------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

# generated via regex from 
COUNTRY_GEONAMES_ID_TO_APLHA3 = {3041565:"AND",290557:"ARE",1149361:"AFG",3576396:"ATG",3573511:"AIA",783754:"ALB",174982:"ARM",3351879:"AGO",6697173:"ATA",3865483:"ARG",5880801:"ASM",2782113:"AUT",2077456:"AUS",3577279:"ABW",661882:"ALA",587116:"AZE",3277605:"BIH",3374084:"BRB",1210997:"BGD",2802361:"BEL",2361809:"BFA",732800:"BGR",290291:"BHR",433561:"BDI",2395170:"BEN",3578476:"BLM",3573345:"BMU",1820814:"BRN",3923057:"BOL",7626844:"BES",3469034:"BRA",3572887:"BHS",1252634:"BTN",3371123:"BVT",933860:"BWA",630336:"BLR",3582678:"BLZ",6251999:"CAN",1547376:"CCK",203312:"COD",239880:"CAF",2260494:"COG",2658434:"CHE",2287781:"CIV",1899402:"COK",3895114:"CHL",2233387:"CMR",1814991:"CHN",3686110:"COL",3624060:"CRI",3562981:"CUB",3374766:"CPV",7626836:"CUW",2078138:"CXR",146669:"CYP",3077311:"CZE",2921044:"DEU",223816:"DJI",2623032:"DNK",3575830:"DMA",3508796:"DOM",2589581:"DZA",3658394:"ECU",453733:"EST",357994:"EGY",2461445:"ESH",338010:"ERI",2510769:"ESP",337996:"ETH",660013:"FIN",2205218:"FJI",3474414:"FLK",2081918:"FSM",2622320:"FRO",3017382:"FRA",2400553:"GAB",2635167:"GBR",3580239:"GRD",614540:"GEO",3381670:"GUF",3042362:"GGY",2300660:"GHA",2411586:"GIB",3425505:"GRL",2413451:"GMB",2420477:"GIN",3579143:"GLP",2309096:"GNQ",390903:"GRC",3474415:"SGS",3595528:"GTM",4043988:"GUM",2372248:"GNB",3378535:"GUY",1819730:"HKG",1547314:"HMD",3608932:"HND",3202326:"HRV",3723988:"HTI",719819:"HUN",1643084:"IDN",2963597:"IRL",294640:"ISR",3042225:"IMN",1269750:"IND",1282588:"IOT",99237:"IRQ",130758:"IRN",2629691:"ISL",3175395:"ITA",3042142:"JEY",3489940:"JAM",248816:"JOR",1861060:"JPN",192950:"KEN",1527747:"KGZ",1831722:"KHM",4030945:"KIR",921929:"COM",3575174:"KNA",1873107:"PRK",1835841:"KOR",831053:"XKX",285570:"KWT",3580718:"CYM",1522867:"KAZ",1655842:"LAO",272103:"LBN",3576468:"LCA",3042058:"LIE",1227603:"LKA",2275384:"LBR",932692:"LSO",597427:"LTU",2960313:"LUX",458258:"LVA",2215636:"LBY",2542007:"MAR",2993457:"MCO",617790:"MDA",3194884:"MNE",3578421:"MAF",1062947:"MDG",2080185:"MHL",718075:"MKD",2453866:"MLI",1327865:"MMR",2029969:"MNG",1821275:"MAC",4041468:"MNP",3570311:"MTQ",2378080:"MRT",3578097:"MSR",2562770:"MLT",934292:"MUS",1282028:"MDV",927384:"MWI",3996063:"MEX",1733045:"MYS",1036973:"MOZ",3355338:"NAM",2139685:"NCL",2440476:"NER",2155115:"NFK",2328926:"NGA",3617476:"NIC",2750405:"NLD",3144096:"NOR",1282988:"NPL",2110425:"NRU",4036232:"NIU",2186224:"NZL",286963:"OMN",3703430:"PAN",3932488:"PER",4030656:"PYF",2088628:"PNG",1694008:"PHL",1168579:"PAK",798544:"POL",3424932:"SPM",4030699:"PCN",4566966:"PRI",6254930:"PSE",2264397:"PRT",1559582:"PLW",3437598:"PRY",289688:"QAT",935317:"REU",798549:"ROU",6290252:"SRB",2017370:"RUS",49518:"RWA",102358:"SAU",2103350:"SLB",241170:"SYC",366755:"SDN",7909807:"SSD",2661886:"SWE",1880251:"SGP",3370751:"SHN",3190538:"SVN",607072:"SJM",3057568:"SVK",2403846:"SLE",3168068:"SMR",2245662:"SEN",51537:"SOM",3382998:"SUR",2410758:"STP",3585968:"SLV",7609695:"SXM",163843:"SYR",934841:"SWZ",3576916:"TCA",2434508:"TCD",1546748:"ATF",2363686:"TGO",1605651:"THA",1220409:"TJK",4031074:"TKL",1966436:"TLS",1218197:"TKM",2464461:"TUN",4032283:"TON",298795:"TUR",3573591:"TTO",2110297:"TUV",1668284:"TWN",149590:"TZA",690791:"UKR",226074:"UGA",5854968:"UMI",6252001:"USA",3439705:"URY",1512440:"UZB",3164670:"VAT",3577815:"VCT",3625428:"VEN",3577718:"VGB",4796775:"VIR",1562822:"VNM",2134431:"VUT",4034749:"WLF",4034894:"WSM",69543:"YEM",1024031:"MYT",953987:"ZAF",895949:"ZMB",878675:"ZWE"}
GEO_SAMPLE_SIZE = 10000

def _geotagcount(api, keywords, media, start, end):
    query = app.core.util.solr_query(keywords, media, start, end)
    app.core.logger.debug("query: _wordcount: %s" % query)
    res = api.sentenceFieldCount(query,tag_sets_id=1011,sample_size=GEO_SAMPLE_SIZE)
    countryTags = []
    res = [ r for r in res if int(r['tag'].split('_')[1]) in COUNTRY_GEONAMES_ID_TO_APLHA3.keys()]
    for r in res:
        geonamesId = int(r['tag'].split('_')[1])
        if geonamesId not in COUNTRY_GEONAMES_ID_TO_APLHA3.keys():   # only include countries
            continue
        r['geonamesId'] = geonamesId    # TODO: move this to JS?
        r['alpha3'] = COUNTRY_GEONAMES_ID_TO_APLHA3[geonamesId]
        r['count'] = (float(r['count'])/float(GEO_SAMPLE_SIZE))    # WTF: why is the API returning this as a string and not a number?
    return res

def _geotagcount_handler(api, keywords, media, start, end):
    try:
        results = _geotagcount(api, keywords, media, start, end)
        return json.dumps(results, separators=(',',':'))
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400

@flapp.route('/api/geotagcount/<keywords>/<media>/<start>/<end>')
@flask_login.login_required
def geotagcount(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return _geotagcount_handler(user_mc, keywords, media, start, end)

@flapp.route('/api/demo/geotagcount/<keywords>')
def demo_geotagcount(keywords):
    media, start, end = demo_params()
    return _geotagcount_handler(mc, keywords, media, start, end)

def geotagcount_handler_csv(api, keywords, media, start, end):
    try:
        results = _geotagcount(api, keywords, media, start, end)
        return assemble_csv_response(results,
            ['alpha3','label','tags_id','geonamesId','count'],
            ['country-alpha3','country-name','mediacloud-tags-id','geonames-id','sampled-count'],
            'geotagcount')
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        app.core.logger.error("Query failed: "+str(exception))
        return json.dumps({'error':str(exception)}, separators=(',',':')), 400    

@flapp.route('/api/geotagcount/<keywords>/<media>/<start>/<end>.csv')
@flask_login.login_required
def geotagcount_csv(keywords, media, start, end):
    user_mc = mcapi.MediaCloud(flask_login.current_user.get_id())
    return geotagcount_handler_csv(user_mc,keywords, media, start, end)

@flapp.route('/api/demo/geotagcount/<keywords>.csv')
def demo_geotagcount_csv(keywords):
    media, start, end = demo_params()
    return geotagcount_handler_csv(mc, keywords, media, start, end)

# -----------------------------------------------------------------------------------------
# HELPERS ---------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------

def _sentences_allowed(key):
    '''
    This method tells you whether the key passed in is allowed to call sentenceList or not.
    Public authenticated users are not allowed to call sentenceList (it throws a 403).
    '''
    media, start, end = demo_params()
    user_mc = mcapi.AdminMediaCloud(flask_login.current_user.get_id())
    query = app.core.util.solr_query('*', media, start, end)
    allowed = None
    try:
        res = user_mc.sentenceList(query, '', 0, 0)
        allowed = True
    except mcerror.MCException as exception:
        app.core.logger.error("Query failed: "+str(exception))
        content = json.dumps({'error':str(exception)}, separators=(',',':'))
        status_code = exception.status_code
        return content, status_code
    except Exception as exception:
        allowed = False
    app.core.logger.debug("_sentences_allowed check: sentenceList %s for key %s " % (allowed, key) )
    return allowed

def assemble_csv_response(results,properties,column_names,filename):
    app.core.logger.debug("assemble_csv_response with "+str(len(results))+" results")
    app.core.logger.debug("  cols: "+' '.join(column_names))
    app.core.logger.debug("  props: "+' '.join(properties))
    # stream back a csv
    def stream_csv(data,props,names):
        yield ','.join(names) + '\n'
        for row in data:
            try:
                attributes = []
                for p in props:
                    value = row[p]
                    cleaned_value = value
                    if isinstance( value, ( int, long, float ) ):
                        cleaned_value = str(row[p])
                    else:
                        cleaned_value = '"'+value.encode('utf-8').replace('"','""')+'"'
                    attributes.append(cleaned_value)
                #attributes = [ csv_escape(str(row[p])) for p in props]
                yield ','.join(attributes) + '\n'
            except Exception as e:
                app.core.logger.error("Couldn't process a CSV row: "+str(e))
                app.core.logger.exception(e)
                app.core.logger.debug(row)
    download_filename = 'mediacloud-'+str(filename)+'-'+datetime.datetime.now().strftime('%Y%m%d%H%M%S')+'.csv'
    return flask.Response(stream_csv(results,properties,column_names), mimetype='text/csv; charset=utf-8', 
                headers={"Content-Disposition":"attachment;filename="+download_filename})

def demo_params():
    media = '{"sets":[8875027]}'
    start_date = datetime.date.today() - datetime.timedelta(days=15)
    end_date = datetime.date.today() - datetime.timedelta(days = 1)
    start = start_date.strftime("%Y-%m-%d")
    end = end_date.strftime("%Y-%m-%d")
    return (media, start, end)
