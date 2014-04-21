import ConfigParser
import hashlib
import sys

import pymongo

def main():
    config = ConfigParser.ConfigParser()
    config.read('app.config')
    host = config.get('database', 'host')
    database = config.get('database', 'database')
    db = pymongo.Connection(host)[database]
    if len(sys.argv) < 2:
        usage()
        
    elif sys.argv[1] == 'add':
        if len(sys.argv) == 4:
            username = sys.argv[2]
            password = hashlib.sha1(sys.argv[3]).hexdigest()
            if db.users.find({'username':username}).count() > 0:
                print "User already exists: %s" % username
            else:
                db.users.insert({'username':username, 'password':password})
                print "Succesfully added user: %s" % username
        else:
            usage()
            
    elif sys.argv[1] == 'remove':
        if len(sys.argv) == 3:
            username = sys.argv[2]
            if db.users.find({'username':username}).count() == 0:
                print "No such user: %s" % username
            else:
                db.users.remove({'username': username})
                print "Succesfully removed user: %s" % username
        else:
            usage()
            
    elif sys.argv[1] == 'password':
        if len(sys.argv) == 4:
            username = sys.argv[2]
            password = hashlib.sha1(sys.argv[3]).hexdigest()
            if db.users.find({'username':username}).count() == 0:
                print "No such user: %s" % username
            else:
                db.users.update({'username':username }, {'$set': {'password':password }})
                print "Succesfully updated password for user: %s" % username
        else:
            usage()
    else:
        usage()
        
def usage():
    print '''Usage:
  userconfig add <username> <password>
  userconfig remove <username>
  userconfig password <username> <password>'''
  
if __name__ == '__main__':
    main()
    
