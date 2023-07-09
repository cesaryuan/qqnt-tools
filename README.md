# 企鹅脑瘫 Tools

> - 本仓库对`企鹅脑瘫`所做的修改均为本地修改，不会窃取、存储、上传任何您的任何信息，如果对此表示怀疑，可查看源码并自行构建
> - 使用本工具所造成的任何后果，本人概不负责
> - 请不要传播本工具，本工具为个人出于学习交流目的而开发，不得用于任何商业用途

为`企鹅脑瘫`添加一些实用的功能，目前包括：

<details><summary>在聊天窗口中合并相同用户的连续消息</summary>

![](docs/images/README/20230514200253.png)

</details>

<details><summary>按鼠标中键显示消息发送时间</summary>

![](docs/images/README/20230530164658.png)

</details>

<details><summary>在用户头像的右键菜单中添加选项，显示该用户的消息记录</summary>

</details>

</details>


## 使用方法

1. 安装[LiteLoaderQQNT](https://github.com/mo-jinran/LiteLoaderQQNT)
2. 克隆本仓库
2. `npm install`
3. `npm run build`
4. 将`plugins`里面的插件复制或软连接到`LiteLoaderQQNT`的插件目录
5. 重启`企鹅脑瘫`

## 卸载

参考`LiteLoaderQQNT`的说明卸载插件

## 更新

1. `git pull`
2. `npm run build`
3. 如果是软连接，则无需操作，否则将`plugins`里面的插件复制或软连接到`LiteLoaderQQNT`的插件目录
4. 重启`企鹅脑瘫`

## 贡献

如果你想要添加或修改新的功能，一般来说，需要以下两步：

- `npm install`安装依赖
- 运行`npm run build`编译项目
- 重启`企鹅脑瘫`

## 致谢

感谢 @steven026 大佬的 [Hook Vue3 app v1.0.3 [Vue3 app劫持 油猴库]-油猴中文网](https://bbs.tampermonkey.net.cn/thread-2886-1-1.html) 提供的基础设施
感谢 [@mo-jinran](https://github.com/mo-jinran) 大佬的 [LiteLoaderQQNT](https://github.com/mo-jinran/LiteLoaderQQNT) 提供的插件平台
感谢 [@mo-jinran](https://github.com/Flysoft-Studio) 大佬的 [QQNTim](https://github.com/Flysoft-Studio/QQNTim) 提供的灵感

## 免责声明

本项目仅供学习交流使用，严禁用于商业用途，如产生法律纠纷与本人无关。

请不要将本项目用于任何违反法律和企业规定的行为，否则后果自负。