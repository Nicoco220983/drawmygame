const { dirname, join } = require('path')
const fs = require('fs')

var prismDir = dirname(require.resolve('mysimplegame'))
var target = join(__dirname, '../static/mysimplegame')

if(!fs.existsSync(target))
  fs.symlinkSync(prismDir, target)
