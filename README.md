webspec
=======
Distributed, living web spec runner and reporter

浏览器内Javascript分布式测试平台。

可以简单的理解为把Karma(Tescluar)放到了互联网，让每个互联网用户成为你潜在的测试用户，并将离散的测试报告汇总以便分析总结。

希望给需要在多平台做浏览器测试的同行一点帮助。

## 贡献

欢迎贡献代码！目前主要待改进:

* Web UI
    * Text Editor
    * Test runner theme
    * Graphs
* Runner script
    * realtime runner script
    * support for more runners，目前只有`jasmine`
        * mocha
        * qunit
* Data Mining for reports

其他的请参考[Issues](https://github.com/RobinQu/webspec-server/issues)。

## 概念

* Live Suites
    * 在线可编辑的测试，可包含多个原文件(source)和测试用例(spec)
    * 每个人可编辑、运行，只有原作者可删除
    * 每个版本可回溯  
    * 可被分享、内嵌
* .webspec
    * 将一个github代码库配置为测试代码库。应用会根据代码库根目录的`.webspec`文件中的规则，来加载测试环境（包含runner类型，specs列表，sources列表等）。
    * 可被分享、内嵌

## 依赖

* 基础设施
  * node v0.11.x
  * redis
* 第三方服务
  * Orchesrate.io
  * Github API
  
## 启动

### 配置文件

编写配置文件；参考[samples/config.json](samples/config.json)。

将配置文件放置到服务可访问的HTTP地址上，应用会根据`CONFIG_URL`变量访问相应配置文件。

例如，配置文件的根路径为`http://yourcompany.com/config.json`，那么就应该将设置为`CONFIG_URL`为`http://yourcompany.com/config.json`。应用会将`CONFIG_URL`加载配置文件。

如果没有设置`CONFIG_URL`，应用会尝试在本地的`config`目录按照搜寻`$(NODE_ENV).json`。例如，`config/development.json`等。

### 执行

如果时第一次运行，请先安装依赖：

```
bower install && npm install
```

然后：

```
npm start
```

程序会默认以开发模式运行（相当于`NODE_ENV=development`）。建议显示制定`NODE_ENV`，例如在生产环境运行时:

```
NODE_ENV=production npm start
```

### 部署

目前还是单节点应用，直接利用`PM2`或者其他脚本运行`lib/app.js`。

`http://webspec.elfvision.com`采用的dokku进行部署，方便快速迭代到线上。

考虑到`/repo`作为github文件代理，访问量会稍大，应该独立出来部署。

## 接口

* Live Suites相关
    * 操作Suite
        * PUT/GET/DELETE /live/suites/:suite
        * POST/GET /live/suites
        * GET /live
    * 操作Spec
        * PUT/GET/DELETE /live/suites/:suite/specs/:spec
        * POST/GET /live/suites/:suite/specs
    * 运行测试，同`/spec`路径下的测试监视器，为LiveSuites优化的版本
        * GET /live/run/:suite/:ref
* Repo访问代理，访问github代码库的文件或文件夹
    * GET /repo/:owner/:repo/:ref/:path
* Sandbox，runner的沙箱环境页面
    * GET /sandboxes/:sandbox
* Spec测试监视器。创建sandbox，并实时更新测试结果，直到结束。并提供测试数据分析。
    * GET /spec/:owner/:repo/:ref 加载代码库的`.webspec`文件进行测试
    * GET /spec/:owner/:repo/:ref/:path 将代码库的某个文件夹作为用例来源进行测试
* User
    * GET /login
    * GET /auth/github
    * GET /auth/github/callback
    * GET /dashboard
    * GET /users/:user
    
   
## License

[MIT](LICENSE)
