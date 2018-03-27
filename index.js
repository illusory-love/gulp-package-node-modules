import through2 from 'through2'
import gutil from 'gulp-util'
import fs from 'fs-extra'
import path from 'path'
import webpack from 'webpack'
import colors from 'colors'

const PluginError = gutil.PluginError
const PLUGIN_NAME = require('./package.json').name
const CWD         = process.cwd()
const DIRECTORY   = 'npm'
const MODULEPATH  = './node_modules'
// webpack 的固定配制项
const WEBPACKCONFIG = {
	output: {
		filename: 'index.js',
		libraryTarget: 'umd'
	}
}

/**
 * 解析打包node_modules模块并替换文件引用 
 * @param {string} options.dev          开发根目录
 * @param {string} options.dist         项目打包根目录
 * @param {string} options.output       打包后的模块存放的目录
 * @param {boolean} options.isLiveUpdate 是否实时打包更新node_modules指定模块
 */
function PackageNodeModule({dev, dist, output, isLiveUpdate}){

	return through2.obj(function(file, enc, cb){
		if (!dist || !dev) {
			this.emit('error', new PluginError(PLUGIN_NAME, '必须指定js工作目录及打包目录'))
		}

		if (file.isNull()){
			this.push(file)
			return cb()
		}

		if (file.isStream()){
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'))
			return cb()
		}

		// 当前文件的绝对路径
		const fileFullPath = file.history[0]
		// 当前文件的开发目录路径, 由 src 里的 base 决定
		const fileBasePath = path.resolve(file.base)
		// 去除开发目录的绝对路径
		const fileDeep     = fileFullPath.replace(fileBasePath, '')
		// 计算出当前文件相对开发目录的层级数
		const deep         = fileDeep.split(/\/|\\/).length
		// 得到相对路径的返回层级数
		// /app.js => ./
		// /utils/utils.js => ../
		const deepStr      = deep == 2 ? './' : '../'.repeat(deep - 2)

		// 待替换处理的字符内容
		const replaceStr = file.contents.toString()
		// 匹配 module 引用语句
		const replaceReg = /import.+from.+(['"`])[\w-]+\1|require\(\s*(['"`])[\w-]+\2/g

		// 匹配文本内的npm模块引用
		const results = replaceStr.replace(replaceReg,  (n) => {
				// 获取当前模块名
			    let moduleName = n.match(/(['"`])[\w-]+\1$/)[0].replace(/^['"`]|['"`]$/g, '')
			    // 目标的文件目录
				const folderPath  = path.resolve(dist, output || DIRECTORY, moduleName)
				const modulePath  = path.resolve(MODULEPATH, moduleName)
				const folderExist = fs.existsSync(folderPath)
				const moduleExist = fs.existsSync(modulePath)
				// 获取当前js文件相对于npm模块的引用路径
				let   npmDirctory = `${deepStr + DIRECTORY}/${moduleName}/index.js`
				// 判断是否需要复制模块文件
				if (moduleExist){
					if (!folderExist || isLiveUpdate){
						// 当前文件不存在或指定了实时更新才复制文件
						// 判断当前模块是否已安装
						WEBPACKCONFIG.entry = path.join(CWD, MODULEPATH, moduleName)
						WEBPACKCONFIG.output.path = folderPath
						// 利用webpack打包并复制模块文件
						// 目前无法应用同步操作, 只能后面再想想看是否能解决同步的单号
						webpack(WEBPACKCONFIG, (err, stat) => console.log(`模块 ${moduleName} 复制成功`.cyan))
					}
				} else {
					npmDirctory = ''
					console.warn(`模块 ${moduleName} 不正确或未安装`.yellow)
				}
				// 返回替换完成后的模块引用路径
				return npmDirctory ? n.replace(/(['"`])[\w-]+\1$/, `$1${npmDirctory}$1`) : n
			})
		// 更新文件内容
		file.contents = new Buffer(results)

		this.push(file)

		cb()
	})
}

module.exports = PackageNodeModule