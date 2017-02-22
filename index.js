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
    hidden: false,
    reverseSort: false,
    // caseSensitive: true,
    group: false,
    size: true,
    humanReadable: true
  }

  // Override default options
  options = _.merge(defaults, options)

  let stopLoop = false
  let basePath = options.directory
  let selectedPath

  return promiseWhile(() => {
    // Continue the promiseWhile loop while stopLoop === false
    return !stopLoop
  }, () => {
    return new Promise((resolve, reject) => {
      // Read directory
      fs.readdir(basePath, (err, files) => {
        // Handle error
        if (err) {
          return reject(err)
        }

        // Filter out hidden files
        if (!options.hidden) {
          files = removeHidden(files)
        }

        // Add dot dot
        files.unshift('..')

        // Format file list
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

              // QuickPickItem
              let item = {}

              // Append a forward slash to directories
              if (stats.isDirectory() && filename !== '..') {
                filename += '/'
              }

              // Add file size
              if (options.size && stats.isFile()) {
                // Human Readable size
                if (options.humanReadable) {
                  item.description = getHumanReadable(stats.size)
                } else {
                  // Add size in bytes
                  item.description = stats.size + ' B'
                }
              }

              // Create the QuickPickItem
              item.label = filename
              item.fullPath = fullPath
              item.stats = stats
              return resolve(item)
            })
          }))
        }

        return Promise.all(promises)
          .then((items) => {
            // Group directories together
            if (options.group) {
              items = groupDirectories(items)
            }

            // Quick Pick interface
            return vscode.window.showQuickPick(items, {
              placeHolder: basePath
            })
              .then((item) => {
                // Nothing selected
                if (typeof (item) === 'undefined') {
                  stopLoop = true
                  return reject(err)
                }
                // Navigate to directory
                if (item.stats.isDirectory()) {
                  basePath = path.resolve(item.fullPath)
                  return resolve()
                }

                // A file has been selected
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
    .catch(() => {
      return Promise.reject()
    })
}

/**
 * @name removeHidden
 * @desc
 * @param
 * @returns
 */
const removeHidden = files => {
  let tmp = []
  for (let file of files) {
    if (_.startsWith(file, '.')) {
      continue
    }
    tmp.push(file)
  }
  return tmp
}

/**
 * @name groupDirectories
 * @desc
 * @param
 * @returns
 */
const groupDirectories = items => {
  let tmpDirectories = []
  let tmpFiles = []
  for (let item of items) {
    // Is it a directory?
    if (item.stats.isDirectory()) {
      tmpDirectories.push(item)
      continue
    }
    // Is it a file?
    if (item.stats.isFile()) {
      tmpFiles.push(item)
    }
  }
  return tmpDirectories.concat(tmpFiles)
}

/**
 * @name promiseWhile
 * @desc
 * @param
 * @param
 * @returns
 */
const promiseWhile = (predicate, action) => {
  function loop () {
    if (!predicate()) return
    return Promise.resolve(action()).then(loop)
  }
  return Promise.resolve().then(loop)
}

/**
 * @name humanReadable
 * @desc
 * @param
 * @returns
 */
const getHumanReadable = (b) => {
  let u = 0
  let s = 1024
  while (b >= s || -b >= s) {
    b /= s
    u++
  }
  return (u ? b.toFixed(1) + ' ' : b) + ' KMGTPEZY'[u] + 'B'
}

module.exports = PathPicker
