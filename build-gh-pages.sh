#!/bin/bash

echo "[ Hit ENTER to continue, Ctrl+C to abort. ]"
read

on_error() {
	echo "Build failed."
	exit 1
}

echo "-- Creating the git branch gh-pages."
git branch -f gh-pages || on_error

echo "-- git checkout gh-pages"
git checkout gh-pages || on_error

echo "-- Building."
npm run-script build || on_error

echo "-- Adding built files."
git add -f example-assets/js/bundle.js || on_error

echo "-- Commiting."
git commit -m "Automated build by build-gh-pages.sh"

echo "[ Push to origin? Hit ENTER to continue, Ctrl+C to abort. ]"
read

echo "-- Publishing."
git push origin gh-pages --force || on_error

echo "-- Done."

