# QQNT Tools

为QQNT添加一些实用的功能，目前包括：

<details><summary>在聊天窗口中合并相同用户的连续消息</summary>

![](docs/images/README/20230514200253.png)

</details>

<details><summary>Open DevTools When press F12</summary>

![](docs/images/README/20230530165038.png)

</details>

<details><summary>按鼠标中键显示消息发送时间</summary>

![](docs/images/README/20230530164658.png)

</details>

<details><summary>在用户头像的右键菜单中添加选项，显示改用户的消息记录</summary>

</details>

## 安装

1. 下载[最新版本](https://github.com/cesaryuan/qqnt-tools/releases)解压到QQNT安装目录下的文件夹`<QQNT>\qqnt-tools`
2. 双击运行`install.bat`
3. 重启QQNT

或者在QQNT安装目录下启动Powershell

```powershell
git clone https://github.com/cesaryuan/qqnt-tools
cd qqnt-tools
npm install
npm run build
. install.ps1
```

## 贡献

- 运行`npm run build`编译项目