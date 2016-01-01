Hyper3D Example Pages
=====================

Examples are contained in the `_examples` directory.

Starting Development Server
---------------------------

* [Ruby](https://www.ruby-lang.org/) 2 or above is required.
* The latest version of [Node.js](https://nodejs.org/en/) is required.

```sh
# Clone
git clone https://github.com/Hyper3D/hyper3d-examples.git
cd hyper3d-examples

# Pull submodules
git submodule foreach 'git pull origin master'
git submodule update

# Install Jekyll
sudo gem install jekyll

# Install required node packages
npm install

# Run server
npm run-script server

# Now open http://127.0.0.1:4000/hyper3d-examples/ in your favorite web browser
```

Publishing
----------

```sh
# This script will automatically switch the current branch to gh-pages,
# compiles a retail version of JS, commit a revision, and pushes to the
# GitHub server (assuming you have permission to do it).
./build-gh-pages.sh

# Don't forget to go back to the master branch.
git checkout -
```

