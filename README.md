# Media Cloud Dashboard

The Media Cloud Dashboard provides a common front-end interface for the Media Cloud data platform.

## Contents
* [Dependencies](#dependencies)
* [Managing Users](#managing-users)

## Dependencies
* flask
* flask-login
* pymongo

## Managing Users
The command line tool `userconfig.py` can be used to add, modify, and remove users.

To see usage, just run `userconfig.py` with no arguments:

    $ python userconfig.py
    Usage:
      userconfig add <username> <password>
      userconfig remove <username>
      userconfig password <username> <password>

To add a user named `alice` with password `topsecret`:

    $ python userconfig.py add alice topsecret
    
To change the password for user `alice` to `bettersecret`:

    $ python userconfig.py password alice bettersecret
    
To remove user `alice`:

    $ python userconfig.py remove alice
