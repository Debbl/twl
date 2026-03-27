try {
  module.exports = require('babel-plugin-twl-macro/macro')
} catch (error) {
  if (!module.parent) {
    throw error
  }

  module.exports = module.parent.require('babel-plugin-twl-macro/macro')
}
