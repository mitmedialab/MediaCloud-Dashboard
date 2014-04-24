import datetime, os, json, multiprocessing

import app

def load_media_info_json():
    static_data_dir = os.path.join(os.path.dirname(os.path.realpath(__file__)),'static','data')
    json_data=open(os.path.join(static_data_dir,'media.json'))
    data = json.load(json_data)
    media_info = data
    json_data.close()
    return media_info
_media_info = load_media_info_json()

def solr_query(media, start, end):
    '''Convert a media query, start and end date into a solr query string.'''
    startdate = datetime.datetime.strptime(start, '%Y-%m-%d').date()
    enddate = datetime.datetime.strptime(end, '%Y-%m-%d').date()
    query = '+publish_date:[%sT00:00:00Z TO %sT23:59:59Z] AND (%s)' % (
        startdate.strftime('%Y-%m-%d')
        , enddate.strftime('%Y-%m-%d')
        , media
    )
    return query

def solr_date_queries(media, start, end):
    '''Return a list of solr queries, one for each day between start and end
    (inclusive).'''
    startdate = datetime.datetime.strptime(start, '%Y-%m-%d').date()
    enddate = datetime.datetime.strptime(end, '%Y-%m-%d').date()
    num_days = (enddate - startdate).days + 1
    dates = [startdate + datetime.timedelta(x) for x in range(num_days)]
    dates = [date.strftime('%Y-%m-%d') for date in dates]
    query_format = "+publish_date:[%sT00:00:00Z TO %sT23:59:59Z] AND %s"
    queries = [(date, query_format % (date, date, media)) for date in dates]
    return queries

def media_to_solr(media):
    d = json.loads(media)
    solr = ['media_id:%s' % i for i in d.get('sources', [])]
    solr += ['media_sets_id:%s' % i for i in d.get('sets', [])]
    query = ' OR '.join(solr)
    return query
    
def all_media():
    return _media_info

def all_media_sources():
    return _media_info.get('sources', [])

def all_media_sets():
    return _media_info.get('sets', [])

class NumFound:
    def __init__(self, mc, keywords, media, start, end):
        self.mc = mc
        self.to_query = []
        queries = solr_date_queries(media_to_solr(media), start, end)
        for q in queries:
            date, query = q
            self.to_query.append((self, keywords, date, query))
            
    def results(self):
        if int(app.config.get('threading', 'num_threads')) > 0:
            return NumFound.thread_pool.map(num_found_worker, self.to_query)
        return [num_found_worker(arg) for arg in self.to_query]

# This should be an instancemethod of NumFound, but Pool.map() requires it
# to be pickle-able, so this is a quick hack to work around that.
def num_found_worker(arg):
    nf, keywords, date, query = arg
    res = nf.mc.sentenceList(keywords, query, 0, 0)
    return {
        'date': date
        , 'numFound': res['response']['numFound']
    }

if int(app.config.get('threading', 'num_threads')) > 0:
    NumFound.thread_pool = multiprocessing.Pool(processes=int(app.config.get('threading', 'num_threads')))
