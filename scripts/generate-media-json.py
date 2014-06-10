import ConfigParser, logging, os, shutil, sys, json, datetime
import mediacloud

CONFIG_FILE = '../app.config'
ITEMS_PER_PAGE = 100
OUTPUT_DIR = '../app/static/data/'
OUTPUT_FILE = 'media.json'
TIMESTAMP_FORMAT = '%Y%m%d%H%M%S'
BACKUP_OUTPUT_FILE = 'media.json.backup-'+datetime.datetime.now().strftime(TIMESTAMP_FORMAT)

def main():

    # first backup the old file
    json_file_path = os.path.join(OUTPUT_DIR, OUTPUT_FILE)
    backup_json_path = os.path.join(OUTPUT_DIR, BACKUP_OUTPUT_FILE)
    if os.path.exists(json_file_path):
        print('Backing up old media.json')
        shutil.copyfile(json_file_path,backup_json_path)

    # connect to mediacloud
    config = ConfigParser.ConfigParser()
    config.read( CONFIG_FILE )
    mc = mediacloud.api.MediaCloud(config.get('mediacloud','key'))
    
    # page through sources
    print "Fetching Sources:"
    sources = []
    current = 0
    more_rows = True
    while more_rows:
        print "  At "+str(current)
        media_list = mc.mediaList(current,ITEMS_PER_PAGE)
        public_media_list = []
        for media in media_list:
            public_tags = [t for t in media['media_source_tags'] if t['show_on_media']==1 or t['show_on_stories']==1]
            if len(public_tags)>0:
                public_media_list.append(media)
        [ sources.append( {'media_id': m['media_id'], 'name': m['name'], 'url': m['url'] } )
            for m in public_media_list ]
        current = current + len(media_list)
        more_rows = True if len(media_list)>0 else False
    
    # page through tag_sets
    public_tag_sets_id = set()
    all_tag_sets_id = set()
    included_tag_sets_id = set()
    more_rows = True
    tag_sets = []
    hidden_tag_sets = {}
    included_tag_sets = {}
    last_id = 0
    while more_rows:
        print " At tag_set " + str(last_id)
        results = mc.tagSetList(last_id, ITEMS_PER_PAGE)
        more_rows = len(results) > 0
        if more_rows:
            last_id = results[-1]['tag_sets_id']
        for r in results:
            all_tag_sets_id.add(r['tag_sets_id'])
            if r['show_on_media'] not in (0, None):
                del r['show_on_media']
                del r['show_on_stories']
                tag_sets.append(r)
                print "Appending tag_set: %s" % r
                public_tag_sets_id.add(r['tag_sets_id'])
                included_tag_sets_id.add(r['tag_sets_id'])
                included_tag_sets[r['tag_sets_id']] = r
                r['tags'] = []
            else:
                try:
                    del r['show_on_media']
                    del r['show_on_stories']
                except KeyError:
                    pass
                hidden_tag_sets[r['tag_sets_id']] = r
    
    # page through tags
    tags = []
    for tag_sets_id in all_tag_sets_id:
        print tag_sets_id
        more_rows = True
        last_id = 0
        while more_rows:
            print " At tag " + str(last_id)
            results = mc.tagList(tag_sets_id, last_id, ITEMS_PER_PAGE)
            more_rows = len(results) > 0
            if more_rows:
                last_id = results[-1]['tags_id']
            for r in results:
                if r['tag_sets_id'] == 5:
                    print r
                if r['show_on_media'] == 1 or r['tag_sets_id'] in public_tag_sets_id:
                    # Remove keys for empty values to save space
                    if not r['description']:
                        del r['description']
                    if not r['label']:
                        del r['label']
                    del r['show_on_media']
                    del r['show_on_stories']
                    if r['tag_sets_id'] not in included_tag_sets_id:
                        # The tag's set wasn't included, add it now
                        tag_set = hidden_tag_sets[r['tag_sets_id']]
                        print "Appending tag_set: %s" % tag_set
                        tag_sets.append(tag_set)
                        included_tag_sets_id.add(r['tag_sets_id'])
                        included_tag_sets[r['tag_sets_id']] = tag_set
                        tag_set['tags'] = []
                    else:
                        tag_set = included_tag_sets[r['tag_sets_id']]
                    tag_set['tags'].append(r)
    
    # stitch it together and output it
    print "Writing Output"
    results = {
        'sources':sources,
        'tag_sets':tag_sets
    }
    with open(json_file_path, 'w') as outfile:
        json.dump(results, outfile, separators=(',',':'))
    print "Done"

if __name__ == '__main__':
    main()
