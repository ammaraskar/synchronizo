# Synchronizo [![Build Status](https://api.travis-ci.org/ammaraskar/synchronizo.svg?branch=master)](https://travis-ci.org/ammaraskar/synchronizo) [![Coverage Status](https://coveralls.io/repos/github/ammaraskar/synchronizo/badge.svg?branch=master)](https://coveralls.io/github/ammaraskar/synchronizo?branch=master)

Here lives the source code for the Synchronizo webapp.

## Directory Structure

`/tests` contains unit tests

`/public` contains all static assets (js/css/images etc)

`/controllers` handles routing requests to the appropriate locations. All the
main routing code can be found under `/controllers/index.js`

`/views` has all the templates used to render Synchronizo pages, this is further
split into folders depending on which routes use the templates.

## How To Run

1. Change into this directory
2. `npm install`
3. `npm start`

If developing, you may want to `npm install -g nodemon` and then use
`nodemon server.js` so that the server auto restarts on changes.

## Testing (with Coverage Details)

1. Change into this directory
2. `npm run-script test-coverage`

## Testing

1. Change into this directory
2. `npm test`
