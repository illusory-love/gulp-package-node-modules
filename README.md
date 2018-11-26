# 背景

因小程序开发本身不支持`npm`包管理的开发模式, 同时又希望使用这种开发模式.
又因每一个js文件需要保持小程序规定的代码定义, 所以不能将开发源码直接全部打包.

因此需要将代码中使用的`npm`包复制到项目中（因小程序对项目大小有控制，故将指定`npm`包打包成一个文件至小程序项目）以便再次 `require`

# 使用

```bash
$ npm i gulp-package-node-modules -S
```

```js
import packageNodeModules from 'gulp-package-node-modules' 

const packageConfig = {
    dev: './src',       // 项目开发目录
    dist: './dist',     // 项目打包目录
    output: './npm',    // node_modules打包后的存放目录
    modules: ['utils'], // 自定义模块目录 (此设置不会生成新文件,仅根据文件层级修改模块引用路径; 如: require('lib/request') -> require('../../utils/lib/request'))
    isLiveUpdate: false // 是否实时更新（不管包是否已复制）
}

gulp.src(`./src/**/*.js`)
    .pipe(packageNodeModules(packageConfig))
    .pipe(gulp.dest('./dist'))
```


# 更新

v 1.2.0

`New` 增加 `modules` 参数 (自定义模块目录)

v 1.1.3

`Imporve` 兼容小程序插件开发的项目目录结构

v 1.1.2

`Imporve` 修复在打包时同一模块在代码中调用了多少次就复制打包多少次的问题

v 1.1.1

`New` 增加对 require('a/b/c') 的支持

v 1.1.0

`New` 因发布的npm模块不支持`es6`语法,因此在发布前对其进行转码编译