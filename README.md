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
The command line tool `userconfig` can be used to add, modify, and remove users.

To see usage, just run `userconfig` with no arguments:
    $ ./userconfig
    Usage:
      userconfig add <username> <password>
      userconfig remove <username>
      userconfig password <username> <password>

To add a user named `alice` with password `topsecret`:
    $ ./userconfig add alice topsecret
    
To change the password for user `alice` to `bettersecret`:
    $ ./userconfig password alice bettersecret
    
To remove user `alice`:
    $ ./userconfig remove `alice`
