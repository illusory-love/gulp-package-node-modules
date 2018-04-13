'use strict';

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _gulpUtil = require('gulp-util');

var _gulpUtil2 = _interopRequireDefault(_gulpUtil);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PluginError = _gulpUtil2.default.PluginError;
var PLUGIN_NAME = require('./package.json').name;
var CWD = process.cwd();
var DIRECTORY = 'npm';
var MODULEPATH = './node_modules';
// webpack 的固定配制项
var WEBPACKCONFIG = {
	output: {
		filename: 'index.js',
		libraryTarget: 'umd'
	}

	/**
  * 解析打包node_modules模块并替换文件引用 
  * @param {string} options.dev          开发根目录
  * @param {string} options.dist         项目打包根目录
  * @param {string} options.output       打包后的模块存放的目录
  * @param {boolean} options.isLiveUpdate 是否实时打包更新node_modules指定模块
  */
};function PackageNodeModule(_ref) {
	var dev = _ref.dev,
	    dist = _ref.dist,
	    output = _ref.output,
	    isLiveUpdate = _ref.isLiveUpdate;


	return _through2.default.obj(function (file, enc, cb) {
		if (!dist || !dev) {
			this.emit('error', new PluginError(PLUGIN_NAME, '必须指定js工作目录及打包目录'));
		}

		if (file.isNull()) {
			this.push(file);
			return cb();
		}

		if (file.isStream()) {
			this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
			return cb();
		}

		// 当前文件的绝对路径
		var fileFullPath = file.history[0];
		// 当前文件的开发目录路径, 由 src 里的 base 决定
		var fileBasePath = _path2.default.resolve(file.base);
		// 去除开发目录的绝对路径
		var fileDeep = fileFullPath.replace(fileBasePath, '');
		// 计算出当前文件相对开发目录的层级数
		var deep = fileDeep.split(/\/|\\/).length;
		// 得到相对路径的返回层级数
		// /app.js => ./
		// /utils/utils.js => ../
		var deepStr = deep == 2 ? './' : '../'.repeat(deep - 2);

		// 待替换处理的字符内容
		var replaceStr = file.contents.toString();
		// 匹配 module 引用语句
		var replaceReg = /import.+from.+(['"`])[^\/\.][\w-\/]+\1|require\(\s*(['"`])[^\/\.][\w-\/]+\2/g;

		// 匹配文本内的npm模块引用
		var results = replaceStr.replace(replaceReg, function (n) {
			// 获取当前模块名
			var moduleName = n.match(/(['"`])[\w-\/]+\1$/)[0].replace(/^['"`]|['"`]$/g, '');
			// 目标的文件目录
			var folderPath = _path2.default.resolve(dist, output || DIRECTORY, moduleName);
			var modulePath = _path2.default.resolve(MODULEPATH, moduleName);
			var folderExist = _fsExtra2.default.existsSync(folderPath);
			var moduleExist = _fsExtra2.default.existsSync(modulePath) || _fsExtra2.default.existsSync(modulePath + '.js');
			// 获取当前js文件相对于npm模块的引用路径
			var npmDirctory = deepStr + DIRECTORY + '/' + moduleName + '/index.js';
			// 判断是否需要复制模块文件
			if (moduleExist) {
				if (!folderExist || isLiveUpdate) {
					// 当前文件不存在或指定了实时更新才复制文件
					// 判断当前模块是否已安装
					WEBPACKCONFIG.entry = _path2.default.join(CWD, MODULEPATH, moduleName);
					WEBPACKCONFIG.output.path = folderPath;
					// 利用webpack打包并复制模块文件
					// 目前无法应用同步操作, 只能后面再想想看是否能解决同步的单号
					(0, _webpack2.default)(WEBPACKCONFIG, function (err, stat) {
						return console.log(('\u6A21\u5757 ' + moduleName + ' \u590D\u5236\u6210\u529F').cyan);
					});
				}
			} else {
				npmDirctory = '';
				console.warn(('\u6A21\u5757 ' + moduleName + ' \u4E0D\u6B63\u786E\u6216\u672A\u5B89\u88C5').yellow);
			}
			// 返回替换完成后的模块引用路径
			return npmDirctory ? n.replace(/(['"`])[\w-\/]+\1$/, '$1' + npmDirctory + '$1') : n;
		});
		// 更新文件内容
		file.contents = new Buffer(results);

		this.push(file);

		cb();
	});
}

module.exports = PackageNodeModule;