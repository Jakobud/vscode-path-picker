'use strict'

const vscode = require('vscode')
const fs = require('fs')
const os = require('os')
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
    files: true,
    directories: true
  }

  // Override default options
  options = _.merge(defaults, options)
}

module.exports = PathPicker
