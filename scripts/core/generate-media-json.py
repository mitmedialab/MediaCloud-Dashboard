import ConfigParser, logging, os, shutil, sys, json, datetime
import mediacloud

CONFIG_FILE = '../../app.config'
ITEMS_PER_PAGE = 1000
OUTPUT_DIR = '../../app/static/core/data/'
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
    print " "
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
    print "  Found %d media source with tags on them" % len(sources)

    # page through tag_sets and tags
    print " "
    print "Fetching TagSets and Public Tags"
    media_tag_sets = []
    last_tag_set_id = 0
    more_tag_sets = True
    while more_tag_sets:
        print "  At tag_set %d" % last_tag_set_id
        tag_sets = mc.tagSetList(last_tag_set_id, ITEMS_PER_PAGE)
        more_tag_sets = len(tag_sets) > 0
        if more_tag_sets:
            last_tag_set_id = tag_sets[-1]['tag_sets_id']
        for ts in tag_sets:
            public_tags_in_set = []
            print "  %d:%s" % (ts['tag_sets_id'],ts['name'])
            last_tag_id = 0
            more_tags = True
            while more_tags:
                #print "    At tag " + str(last_tag_id)
                tags = mc.tagList(ts['tag_sets_id'], last_tag_id, ITEMS_PER_PAGE, True)
                more_tags = len(tags) > 0
                if more_tags:
                    last_tag_id = tags[-1]['tags_id']
                for t in tags:
                    if t['show_on_media'] not in (0, None):
                        public_tags_in_set.append(t)
            if len(public_tags_in_set)>0:
                print "    ! %d tags in set to add" % len(public_tags_in_set)
                ts['tags'] = public_tags_in_set
                media_tag_sets.append(ts)

    # stitch it together and output it
    print "Writing Output to %s" % json_file_path
    results = {
        'sources':sources,
        'tag_sets':media_tag_sets
    }
    with open(json_file_path, 'w') as outfile:
        json.dump(results, outfile, separators=(',',':'))

if __name__ == '__main__':
    main()
