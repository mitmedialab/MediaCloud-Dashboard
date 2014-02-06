# CFCM Skeleton App

This is a skeleton web application using the MongoDB, Flask, backbone.js,
bootstrap.js stack.  You can use it as a starting point to create your own
web app based on this stack.

## Contents
* [Forking](#forking)
* [Installation](#installation)
* [Managing Users](#managing-users)
* [Running](#running)

## Forking
To create your own application based on this one, first create a new git
repository (e.g. on github).  Next, clone this repo:

    $ git clone https://github.com/c4fcm/Skeleton-App.git MyApp
    
Then change the origin on the cloned repo to the repo for your new app,
and push.

    $ cd MyApp
    $ git remote rm origin
    $ git remote add origin https://github.com/myuser/MyApp.git
    $ git push -u origin master

This example will push a fresh fork of the repo to `myuser`'s `MyApp` repo.

## Installation
To install this app, first install the dependencies, and then create a
configuration file.

### Dependencies

* flask
* flask-login
* pymongo

### Configuration

To configure, copy the sample configuration file and fill it in with your info.

    $ cp app.config.sample app.config

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

    $ ./userconfig remove alice

## Running

To run the app locally, just run `server.py`:

    $ python server.py

