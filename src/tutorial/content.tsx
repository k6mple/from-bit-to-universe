import { Callout, CommandBlock, H1, H2, Lead, P, TutorialImage } from './components'

/* ==================================================================== *
 *
 *  教程正文 —— 全部写在这个文件里。保存即热更新，其它文件都不用动。
 *
 *  ── 可以用的组件（实现在 ./components/，样式已经调好）──────────────
 *
 *    <H1>页面主标题</H1>          整页只用一次
 *    <H2>第一步 · 章节标题</H2>    一个步骤一个
 *    <H3>小节标题</H3>            步骤里的具体操作
 *    <Lead>标题下面的一段引导语</Lead>
 *    <P>正文段落</P>
 *
 *  ── 段落里可以直接写这些，样式自动生效 ──────────────────────────
 *
 *    <strong>加粗</strong>
 *    <code>行内代码</code>
 *    <a href="https://example.com">超链接</a>
 *    <ul><li>无序列表</li></ul>
 *    <ol><li>有序列表</li></ol>
 *
 *  ── 命令框（右上角带复制按钮）───────────────────────────────────
 *
 *    <CommandBlock lines={['第一条命令', '第二条命令']} />
 *
 *    <CommandBlock lang="powershell">{`
 *      # 以 # 开头的行会显示成灰色注释
 *      第一条命令 --参数
 *    `}</CommandBlock>
 *
 *    颜色是自动分的：每行第一个词（程序名）用页面主色，- 开头的参数用琥珀色，
 *    其余保持白色；行内 # 之后的内容也算注释（命令后面跟一句说明很方便）。
 *    lang 只是左上角的标签（bash / powershell / cmd），不会进入复制内容，
 *    复制出来的永远只有命令本身。
 *
 *  ── 图片 ────────────────────────────────────────────────────────
 *
 *    <TutorialImage
 *      src="tutorial/step-1.png"
 *      alt="终端里执行安装命令的画面"
 *      caption="图 1 · 安装完成"
 *      width={1600}
 *      height={900}
 *    />
 *
 *    截图文件放进 public/tutorial/ 目录。不写 src 时显示为虚线占位框。
 *    写上原图的 width / height，图片下载完成前浏览器就会把位置留好，
 *    下面的文字不会跳动。
 *
 *    竖长的截图（比如安装向导窗口）铺满整栏会显得特别大，加一个
 *    maxWidth={560} 就能把它限制到和 16:9 的截图差不多的观感，
 *    同时图片和说明文字一起居中。
 *
 *  ── 提示块 ──────────────────────────────────────────────────────
 *
 *    <Callout>普通提示</Callout>
 *    <Callout type="warning" title="注意">警告内容</Callout>
 *
 * ==================================================================== */

/**
 * 下面是为了验收版式搭的骨架：每个「等待填写」都是留给你写的位置，
 * 直接替换成真实内容即可，不必改动组件。
 */
export function Content() {
  return (
    <>
      <H1>如何用Claude Code进行开发</H1>

      {/* 简短介绍 */}
      <Lead>［目标：安装好claude code并配置国产模型，安装一个skill，开发出你的第一个网页］</Lead>

      {/* ───────────────────────── 第一步 ───────────────────────── */}

      <H2>第一步 · 环境准备（安装node.js）</H2>

      {/* 正文 */}
      <P> 由于网络防火墙限制，直接下载nodejs会非常慢，在此处提供网盘链接：通过网盘分享的文件：node-v24.21.0-x64.msi
链接: https://pan.baidu.com/s/1_caQ1EEa6HSJmZL5UXhPUQ?pwd=bpj7 提取码: bpj7</P>

      <P>直接一路next并安装即可</P>


      {/* 图片：截图放进 public/tutorial/，再补上 src 和 caption */}
      <TutorialImage
        src="tutorial/nodejs.png"
        width={774}
        height={601}
        maxWidth={560}
        caption="nodejs安装说明"
      />

      {/* ───────────────────────── 第二步 ───────────────────────── */}

      <H2>第二步 · 安装 Claude Code</H2>

      {/* 正文 */}
      <P>macOS, Linux, WSL:</P>

      {/* 命令 */}
      <CommandBlock lang="bash">{`
        curl -fsSL https://claude.ai/install.sh | bash
      `}</CommandBlock>

      <P>Windows PowerShell:</P>

      {/* 命令 */}
      <CommandBlock lang="bash">{`
        winget install Anthropic.ClaudeCode
      `}</CommandBlock>

      <P>跟随指示安装完成后，在shell中运行：</P>
      {/* 命令 */}
      <CommandBlock lang="bash">{`
        claude --version
      `}</CommandBlock>
      {/* 图片 */}
      <TutorialImage
        caption="［输出版本号即为安装成功］"
        src="tutorial/claudeversion.png"
        width={1734}
        height={928}
      />

      {/* ───────────────────────── 第三步 ───────────────────────── */}

      <H2>第三步 · 获取一个api_key（以deepseek为例）</H2>
      
      <a href='https://platform.deepseek.com/api_keys'>点击前往deepseek</a>
      {/* 正文 */}
      <P>申请你的第一个api key</P>
      
      <TutorialImage src="tutorial/apikey.png" caption="apikey" width={2543} height={1464} />
      {/* 提示：需要警告样式时写 <Callout type="warning" title="注意">…</Callout> */}
      <Callout>［注意保存好你的api_key，key只会出现一次，注意保存并不要轻易泄露给他人，若泄露，及时删除key然后再申请一个就好］</Callout>

      生成好后在充值页面充个10块钱试试水就好
      
      <H2>第四步 · 配置 Claude Code</H2>

      <P>在C:/Users/你的用户名/.claude新建一个settings.json，若已有则直接打开</P>

      <P>内容示例如下</P>

      <CommandBlock lang="settings.json">{`
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": <你刚刚申请的api>,
    "ANTHROPIC_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-flash[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-flash",
    "CLAUDE_CODE_SUBAGENT_MODEL": "deepseek-flash",
    "CLAUDE_CODE_EFFORT_LEVEL": "max",
    "CLAUDE_CODE_AUTO_COMPACT_WINDOW": "786432"
  },
  "model": "opus[1m]",
  "tui": "default"
}
      `}</CommandBlock>

    <P>一般来说，在大模型厂商的网站里，都会提供doc告诉你如何将模型连接到各个agent里面</P>

    <P>在https://api-docs.deepseek.com/，ds就配备了详细的文档，包括api调用，价格，agent集成</P>

    <P>一切准备好后，在powershell中运行：</P>
    
    <CommandBlock lang="bash">{`
        claude
      `}</CommandBlock>

    <P>选择信任此文件夹后，应该就可以看到如下界面</P>

    <TutorialImage caption="［claude成功运行］" src="tutorial/claude.png" width={1734} height={927} />

    <P>DeepSeek API 原生支持 Claude Code 中的 Web Search 功能，我们可以在输入框中输入提示词来测试一下，比如：</P>

    <TutorialImage caption="［claude成功运行］" src="tutorial/search.png" width={1734} height={927} />

    <P>若要安装skill，以frontend_design为例，可以在输入框中输入： /plugin install frontend-design@claude-plugins-official</P>
    <P>随后就会自动安装，或者你可以直接让claude帮你装你想要的skill</P>
    <P>skill可以规范化agent的工作能力并给它更多可用的工具，让agent执行更高效准确</P>

    <P>接下来你就可以自己探索了</P>
    </>

    
  )
}
