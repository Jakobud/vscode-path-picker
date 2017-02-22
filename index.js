'use strict'

const vscode = require('vscode')
const fs = require('fs')
const os = require('os')
const path = require('path')
const _ = require('lodash')

/**
 * @name PathPicker
 * @module
 * @desc
 */
const PathPicker = function (options) {
  // Default options
  const defaults = {
    directory: os.homedir(),
    hidden: true,
    sort: 'alphabetical',
    caseSensitive: true,
    groupFolders: false,
    reverse: false
  }

  // Override default options
  options = _.merge(defaults, options)

  let stopLoop = false
  let basePath = options.directory
  let selectedPath

  return promiseWhile(() => {
    return !stopLoop
  }, () => {
    return new Promise((resolve, reject) => {
      // Read directory
      fs.readdir(basePath, (err, files) => {
        // Handle error
        if (err) {
          return reject(err)
        }

        files.unshift('..')

        // Loop through the files
        let promises = []
        for (let filename of files) {
          promises.push(new Promise((resolve, reject) => {
            // Full file path
            const fullPath = path.resolve(basePath, filename)
            // File stats
            fs.stat(fullPath, function (err, stats) {
              // Handle errors
              if (err) {
                return reject(err)
              }

              // Append a forward slash to directories
              if (stats.isDirectory() && filename !== '..') {
                filename += '/'
              }

              // Create the QuickPickItem
              let item = {
                label: filename,
                fullPath: fullPath,
                stats: stats
              }
              return resolve(item)
            })
          }))
        }

        return Promise.all(promises)
        .then((items) => {
          return vscode.window.showQuickPick(items, {
            placeHolder: basePath
          })
          .then((item) => {
            // Nothing selected
            if (typeof (item) === 'undefined') {
              stopLoop = true
              return reject('No file path selected')
            }
            // Navigate to directory
            if (item.stats.isDirectory()) {
              basePath = path.resolve(basePath, item.label)
              return resolve()
            }

            // A file has picked
            stopLoop = true
            selectedPath = item.fullPath
            return resolve()
          }, (err) => {
            return reject(err)
          })
        })
      })
    })
  })
  .then(() => {
    return Promise.resolve(selectedPath)
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

const promiseWhile = (predicate, action) => {
  function loop () {
    if (!predicate()) return
    return Promise.resolve(action()).then(loop)
  }
  return Promise.resolve().then(loop)
}

module.exports = PathPicker
