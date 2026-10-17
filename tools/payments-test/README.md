# Payments Worker tests (for developers, no need to upload)

Runs `worker/payments-worker.js` against local stand-ins for Payme (Merchant API callbacks and
Subscribe API, with Payme's published test cards), Firestore REST, Google OAuth and Firebase sign-in.
Node 20 or newer, nothing to install.

    SITE_DIR=$PWD WORKER=$PWD/worker/payments-worker.js node tools/payments-test/e2e.mjs

`server.mjs <siteDir> <workerFile>` serves the site on :8791 with the Worker on :8792 and a test
student signed in, for clicking through the card form and the Payme-page return in a browser.

These are not Payme's sandbox. Do the real sandbox checks in README section 6, step E.
