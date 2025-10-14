import { app } from 'electron'
import { extname, isAbsolute, join } from 'path'
import { existsSync, readFileSync, unlinkSync } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as ws from 'windows-shortcuts'
import { tmpdir } from 'os'
import * as ResEdit from 'resedit'

const execAsync = promisify(exec)

interface IcojsImage {
  width?: number
  data?: Uint8Array
  buffer?: ArrayBuffer
}

// 使用 icojs 将 ICO Buffer 转换为 PNG DataURL（当 nativeImage 失败时使用）
async function convertIcoBufferToPngDataUrl(iconBuffer: Buffer): Promise<string | null> {
  try {
    const icojsMod = (await import('icojs')) as unknown as {
      parse?: (data: ArrayBuffer, type?: string) => Promise<IcojsImage[]>
      default?: { parse?: (data: ArrayBuffer, type?: string) => Promise<IcojsImage[]> }
    }
    const parseFn = icojsMod.parse || (icojsMod.default && icojsMod.default.parse)
    if (!parseFn) return null

    const arrayBuffer = new ArrayBuffer(iconBuffer.byteLength)
    const view = new Uint8Array(arrayBuffer)
    view.set(iconBuffer)

    const images = await parseFn(arrayBuffer, 'image/png')
    if (!images || images.length === 0) return null

    images.sort((a, b) => (b.width || 0) - (a.width || 0))
    const best = images[0]

    let pngBytes: Uint8Array
    if (best.data && best.data instanceof Uint8Array) {
      pngBytes = best.data
    } else if (best.buffer) {
      pngBytes = new Uint8Array(best.buffer)
    } else {
      pngBytes = new Uint8Array()
    }

    if (!pngBytes || pngBytes.length === 0) return null

    const base64 = Buffer.from(pngBytes).toString('base64')
    return `data:image/png;base64,${base64}`
  } catch {
    return null
  }
}

/**
 * IconsExtract 工具路径 (需要下载并放置在 resources 目录)
 * 在开发环境使用项目根目录的 resources，在生产环境使用 app.getPath('exe') 所在目录的 resources
 */
function getIconsExtractPath(): string {
  // 开发环境：使用项目根目录
  if (!app.isPackaged) {
    return join(app.getAppPath(), 'resources', 'tools', 'iconsext.exe')
  }
  // 生产环境：使用打包后的 resources 目录
  return join(process.resourcesPath, 'tools', 'iconsext.exe')
}

const ICONS_EXTRACT_PATH = getIconsExtractPath()

// 配置项：是否优先使用 IconsExtract（建议默认开启，质量更好）
const ICONS_EXTRACT_FIRST = true
// 配置项：是否允许对 .lnk 直接使用 IconsExtract（部分场景有效）
const ALLOW_ICONSEXTRACT_ON_LNK = true

/**
 * 图标质量评分
 */
interface IconQuality {
  icon: string
  score: number
  source: string
}

/**
 * 解析带资源索引的图标路径
 * 例如: "C:\Windows\System32\shell32.dll,-21" 或 "%SystemRoot%\system32\imageres.dll,-5"
 */
function parseIconPath(iconPath: string): { path: string; index: number } | null {
  try {
    if (!iconPath) return null

    // 展开环境变量
    const expandedPath = iconPath
      .replace(/%SystemRoot%/gi, process.env.SystemRoot || 'C:\\Windows')
      .replace(/%windir%/gi, process.env.windir || 'C:\\Windows')
      .replace(/%ProgramFiles%/gi, process.env.ProgramFiles || 'C:\\Program Files')
      .replace(
        /%ProgramFiles\(x86\)%/gi,
        process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
      )

    // 检查是否包含索引
    const indexMatch = expandedPath.match(/^(.+),(-?\d+)$/)
    if (indexMatch) {
      const path = indexMatch[1].trim().replace(/^["']|["']$/g, '')
      const index = parseInt(indexMatch[2])
      return { path, index }
    }

    // 没有索引，返回原始路径
    return { path: expandedPath.trim().replace(/^["']|["']$/g, ''), index: 0 }
  } catch (error) {
    console.error('Error parsing icon path:', error)
    return null
  }
}

/**
 * 规范化 Program Files 路径（在 x64/x86 之间切换以匹配真实存在的路径）
 */
function normalizeProgramFilesPath(originalPath: string): string {
  try {
    if (!originalPath) return originalPath

    // 使用原始未转义路径进行判断与替换
    const rawPf = process.env.ProgramFiles || 'C:\\Program Files'
    const rawPfX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    const p = originalPath

    // 若原路径不存在，尝试在 x86 与 非 x86 之间切换
    if (!existsSync(p)) {
      if (p.startsWith(rawPfX86)) {
        const alt = p.replace(rawPfX86, rawPf)
        if (existsSync(alt)) return alt
      }
      if (p.startsWith(rawPf)) {
        const alt = p.replace(rawPf, rawPfX86)
        if (existsSync(alt)) return alt
      }

      // 宽松替换（避免盘符环境变量异常时错过）
      if (p.includes('Program Files (x86)')) {
        const alt = p.replace('Program Files (x86)', 'Program Files')
        if (existsSync(alt)) return alt
      }
      if (p.includes('Program Files') && !p.includes('Program Files (x86)')) {
        const alt = p.replace('Program Files', 'Program Files (x86)')
        if (existsSync(alt)) return alt
      }
    }

    return originalPath
  } catch {
    return originalPath
  }
}

/**
 * 验证 .exe 文件是否包含图标资源（使用 resedit）
 * @param exePath .exe 文件路径
 * @returns 是否包含图标
 */
function hasIconResource(exePath: string): boolean {
  try {
    if (!exePath.toLowerCase().endsWith('.exe')) {
      return false
    }

    if (!existsSync(exePath)) {
      return false
    }

    // 读取并解析 PE 文件
    const exeData = readFileSync(exePath)
    const exe = ResEdit.NtExecutable.from(exeData)
    const res = ResEdit.NtExecutableResource.from(exe)

    // 查找图标资源
    const iconGroups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)
    return iconGroups.length > 0
  } catch {
    // 如果解析失败，假设没有图标
    return false
  }
}

/**
 * 提取文件图标
 * @param filePath 文件路径
 * @returns base64 格式的图标,如果失败返回 null
 */
export async function extractIcon(filePath: string): Promise<string | null> {
  try {
    if (
      !filePath ||
      typeof filePath !== 'string' ||
      !isAbsolute(filePath) ||
      !existsSync(filePath)
    ) {
      return null
    }

    const ext = extname(filePath).toLowerCase()

    // 如果是 .lnk 文件,需要先解析快捷方式获取目标路径
    if (ext === '.lnk') {
      return await extractIconFromLnk(filePath)
    }

    // 对于其他文件,先尝试 IconsExtract-first（如开启）
    if (ICONS_EXTRACT_FIRST) {
      const early = await extractIconViaIconsExtract(filePath)
      if (early && calculateIconQuality(early) >= 200) {
        return early
      }
    }

    return await extractIconDirect(filePath)
  } catch (error) {
    console.error('Error in extractIcon:', error)
    return null
  }
}

/**
 * 使用 PowerShell COM 对象解析 .lnk 文件 (更可靠的编码处理)
 */
async function parseLnkViaPowerShell(lnkPath: string): Promise<{
  target: string
  icon: string
  iconIndex: number
} | null> {
  try {
    console.log('  → Parsing .lnk via PowerShell COM...')

    // PowerShell 脚本: 使用 WScript.Shell COM 对象解析快捷方式
    const tempJsonPath = join(tmpdir(), `lnk_parse_${Date.now()}.json`)
    const psScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut("${lnkPath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}")

    $result = @{
        Target = $shortcut.TargetPath
        Icon = $shortcut.IconLocation
        WorkingDir = $shortcut.WorkingDirectory
    }

    # 输出 JSON 到 stdout
    $json = ($result | ConvertTo-Json -Compress)
    Write-Output $json

    # 额外兜底：落盘到文件，便于 stdout 丢失时读取
    $json | Out-File -FilePath "${tempJsonPath.replace(/\\/g, '\\\\')}" -Encoding UTF8

    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
`.trim()

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
    const { stdout } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      {
        timeout: 5000,
        encoding: 'utf8'
      }
    )

    let outputText = stdout ? stdout.trim() : ''
    if (!outputText || outputText.length === 0) {
      try {
        if (existsSync(tempJsonPath)) {
          outputText = readFileSync(tempJsonPath, 'utf8').trim()
        }
      } catch {
        // ignore
      }
      if (!outputText) return null
    }

    const data = JSON.parse(outputText)

    let iconPath = ''
    let iconIndex = 0
    if (data.Icon) {
      const match = data.Icon.match(/^(.+),(-?\d+)$/)
      if (match) {
        iconPath = match[1]
        iconIndex = parseInt(match[2])
      } else {
        iconPath = data.Icon
      }
    }

    return {
      target: data.Target || '',
      icon: iconPath,
      iconIndex: iconIndex
    }
  } catch {
    return null
  }
}

/**
 * 从 .lnk 快捷方式文件提取图标（优先使用 PowerShell COM 解析）
 */
async function extractIconFromLnk(lnkPath: string): Promise<string | null> {
  let shortcutData = await parseLnkViaPowerShell(lnkPath)

  // 如果 PowerShell 失败,使用 windows-shortcuts 库作为后备
  if (!shortcutData || !shortcutData.target) {
    const wsData = await new Promise<{
      target: string
      icon: string
      iconIndex: number
    } | null>((resolve) => {
      ws.query(lnkPath, (error, data) => {
        if (error || !data) {
          resolve(null)
          return
        }

        resolve({
          target: data.target || '',
          icon: data.icon || '',
          iconIndex: data.iconIndex || 0
        })
      })
    })

    if (wsData) {
      shortcutData = wsData

      // 如果 windows-shortcuts 返回 target 但路径不存在,再次用 PowerShell 兜底解析一次
      if (shortcutData && shortcutData.target && !existsSync(shortcutData.target)) {
        const psRetry = await parseLnkViaPowerShell(lnkPath)
        if (psRetry && psRetry.target) {
          shortcutData.target = psRetry.target
          shortcutData.icon = psRetry.icon || shortcutData.icon
          shortcutData.iconIndex = psRetry.iconIndex || shortcutData.iconIndex
        }
      }
    }
  }

  // 如果两种方法都失败,直接提取 .lnk 文件的图标
  if (!shortcutData || !shortcutData.target) {
    return await extractIconDirect(lnkPath)
  }

  // 对 target 进行 Program Files/x86 的存在性纠正
  if (shortcutData.target) {
    const normalized = normalizeProgramFilesPath(shortcutData.target)
    if (normalized !== shortcutData.target) {
      shortcutData.target = normalized
    }
  }

  // IconsExtract-first：优先尝试 IconsExtract（target 优先，其次 .lnk 本身）
  if (ICONS_EXTRACT_FIRST) {
    const earlyCandidates: IconQuality[] = []
    const MIN_QUALITY_THRESHOLD = 200

    if (shortcutData.target && existsSync(shortcutData.target)) {
      const earlyIconTarget = await extractIconViaIconsExtract(shortcutData.target)
      if (earlyIconTarget) {
        earlyCandidates.push({
          icon: earlyIconTarget,
          score: calculateIconQuality(earlyIconTarget),
          source: 'IconsExtract (target, early)'
        })
      }
    }

    const earlyIconLnk = await extractIconViaIconsExtract(lnkPath)
    if (earlyIconLnk) {
      earlyCandidates.push({
        icon: earlyIconLnk,
        score: calculateIconQuality(earlyIconLnk),
        source: 'IconsExtract (.lnk, early)'
      })
    }

    if (earlyCandidates.length > 0) {
      earlyCandidates.sort((a, b) => b.score - a.score)
      const bestEarly = earlyCandidates[0]
      if (bestEarly.score >= MIN_QUALITY_THRESHOLD) {
        return bestEarly.icon
      }
    }
  }

  // 🎯 关键优化：如果 target 是 .exe 文件，验证其有图标后直接提取
  if (shortcutData.target && shortcutData.target.toLowerCase().endsWith('.exe')) {
    if (existsSync(shortcutData.target) && hasIconResource(shortcutData.target)) {
      const targetIcon = await extractIconDirect(shortcutData.target)
      if (targetIcon) {
        return targetIcon
      }
    }
  }

  // 收集所有可能的图标来源
  const iconSources: Array<{ name: string; path: string }> = []

  // 优先级1: icon 字段 (如果存在,通常是专门指定的图标)
  if (shortcutData.icon) {
    // 解析可能包含索引的图标路径
    const parsed = parseIconPath(shortcutData.icon)
    if (parsed && parsed.path) {
      iconSources.push({ name: 'icon field', path: parsed.path })
      console.log(`  → Parsed icon path: ${parsed.path} (index: ${parsed.index})`)
    } else {
      iconSources.push({ name: 'icon field', path: shortcutData.icon })
    }
  }

  // 优先级2: target 字段 (目标程序)
  if (shortcutData.target) {
    iconSources.push({ name: 'target', path: shortcutData.target })

    // 对于 .lnk 指向 .lnk 的情况，递归提取
    if (shortcutData.target.toLowerCase().endsWith('.lnk')) {
      console.log('  → Target is also a .lnk file, will try recursive extraction')
    }
  }

  // 优先级3: .lnk 文件本身
  iconSources.push({ name: 'lnk file', path: lnkPath })

  // 尝试所有来源,使用质量评分选择最好的图标
  const iconQualities: IconQuality[] = []

  for (let i = 0; i < iconSources.length; i++) {
    const source = iconSources[i]
    console.log(`Strategy ${i + 1}: Trying ${source.name}: ${source.path}`)

    const icon = await extractIconDirect(source.path)
    if (icon) {
      const score = calculateIconQuality(icon)
      console.log(
        `✓ Icon extracted from ${source.name}, length: ${icon.length}, quality score: ${score}`
      )

      iconQualities.push({
        icon,
        score,
        source: source.name
      })
    } else {
      console.log(`✗ Failed to extract icon from ${source.name}`)
    }
  }

  // 选择质量最好的图标
  if (iconQualities.length > 0) {
    iconQualities.sort((a, b) => b.score - a.score)
    const best = iconQualities[0]
    console.log(`✓ Best icon found: ${best.source} (score: ${best.score})`)

    // 质量阈值检查：如果最佳图标质量太低，继续尝试其他方法
    const MIN_QUALITY_THRESHOLD = 200 // 基于 base64 长度约 20000+ 或 PNG 格式
    if (best.score >= MIN_QUALITY_THRESHOLD) {
      console.log(`✓ Icon quality acceptable (${best.score} >= ${MIN_QUALITY_THRESHOLD}), using it`)
      return best.icon
    }

    console.log(
      `⚠ Icon quality too low (${best.score} < ${MIN_QUALITY_THRESHOLD}), trying advanced methods...`
    )
  }

  // 标准方法失败或质量太低，尝试 IconsExtract 工具
  console.log('⚠ Trying IconsExtract for better quality...')

  // 策略0: IconsExtract 工具提取
  console.log('  → Strategy 0: IconsExtract on .lnk file')
  let iconsExtIcon = await extractIconViaIconsExtract(lnkPath)
  if (iconsExtIcon) {
    const quality = calculateIconQuality(iconsExtIcon)
    console.log(`  ✓ IconsExtract succeeded on .lnk file (quality: ${quality})`)
    iconQualities.push({ icon: iconsExtIcon, score: quality, source: 'IconsExtract (.lnk)' })
  }

  // 如果有 target，尝试从 target 提取
  if (shortcutData.target && existsSync(shortcutData.target)) {
    console.log('  → Strategy 0B: IconsExtract on target')
    iconsExtIcon = await extractIconViaIconsExtract(shortcutData.target)
    if (iconsExtIcon) {
      const quality = calculateIconQuality(iconsExtIcon)
      console.log(`  ✓ IconsExtract succeeded on target (quality: ${quality})`)
      iconQualities.push({
        icon: iconsExtIcon,
        score: quality,
        source: 'IconsExtract (target)'
      })
    }
  }

  // 尝试增强版 PowerShell 后备方案
  console.log('⚠ Trying enhanced PowerShell for better quality...')

  // 策略A: 增强版 PowerShell 直接处理 .lnk 文件
  console.log('  → Strategy A: Enhanced PowerShell on .lnk file')
  let psIcon = await extractIconViaPowerShellEnhanced(lnkPath)
  if (psIcon) {
    const quality = calculateIconQuality(psIcon)
    console.log(`  ✓ Enhanced PowerShell succeeded on .lnk file (quality: ${quality})`)
    iconQualities.push({ icon: psIcon, score: quality, source: 'PowerShell Enhanced (.lnk)' })
  }

  // 策略B: 如果有 target，增强版 PowerShell 处理 target
  if (shortcutData.target && existsSync(shortcutData.target)) {
    console.log('  → Strategy B: Enhanced PowerShell on target')
    psIcon = await extractIconViaPowerShellEnhanced(shortcutData.target)
    if (psIcon) {
      const quality = calculateIconQuality(psIcon)
      console.log(`  ✓ Enhanced PowerShell succeeded on target (quality: ${quality})`)
      iconQualities.push({
        icon: psIcon,
        score: quality,
        source: 'PowerShell Enhanced (target)'
      })
    }
  }

  // 策略C: 简单 PowerShell 作为最后尝试
  console.log('  → Strategy C: Simple PowerShell fallback on .lnk')
  psIcon = await extractIconViaPowerShellSimple(lnkPath)
  if (psIcon) {
    const quality = calculateIconQuality(psIcon)
    console.log(`  ✓ Simple PowerShell succeeded (quality: ${quality})`)
    iconQualities.push({ icon: psIcon, score: quality, source: 'PowerShell Simple' })
  }

  // 选择所有方法中质量最好的图标
  if (iconQualities.length > 0) {
    iconQualities.sort((a, b) => b.score - a.score)
    const best = iconQualities[0]
    console.log(
      `✓ Using best icon from ${best.source} (final score: ${best.score}, total candidates: ${iconQualities.length})`
    )
    return best.icon
  }

  console.log('✗ All strategies failed, returning null')
  return null
}

/**
 * 计算图标质量评分
 * 基于 base64 长度和其他因素
 */
function calculateIconQuality(base64Icon: string): number {
  // 基础分数基于数据大小 (更大的图标通常质量更好)
  const lengthScore = Math.min(base64Icon.length / 100, 1000)

  // 检查是否是透明 PNG (通常质量更好)
  const isPng = base64Icon.includes('data:image/png')
  const formatBonus = isPng ? 100 : 0

  return lengthScore + formatBonus
}

/**
 * 使用 IconsExtract 工具提取图标
 * 需要先下载 iconsext.exe 并放置在 resources/tools/ 目录
 */
async function extractIconViaIconsExtract(filePath: string): Promise<string | null> {
  try {
    console.log('=== IconsExtract Extraction Start ===')
    console.log('  → Target file:', filePath)
    console.log('  → IconsExtract path:', ICONS_EXTRACT_PATH)

    // 检查源文件是否存在
    if (!existsSync(filePath)) {
      console.log('  ✗ Source file does not exist:', filePath)
      return null
    }
    console.log('  ✓ Source file exists')

    // 检查文件类型 - IconsExtract 主要用于 PE 文件（.exe, .dll 等）
    // 对于 .ico 文件效果不佳，跳过以避免不必要的处理
    const ext = extname(filePath).toLowerCase()
    if (ext === '.ico') {
      console.log('  ℹ Skipping IconsExtract for .ico file (standalone icon file)')
      return null
    }
    if (ext === '.lnk' && !ALLOW_ICONSEXTRACT_ON_LNK) {
      console.log('  ℹ Skipping IconsExtract for .lnk file (shortcut file) by config')
      return null
    }

    // 检查 IconsExtract 是否存在
    if (!existsSync(ICONS_EXTRACT_PATH)) {
      console.log('  ✗ IconsExtract not found at:', ICONS_EXTRACT_PATH)
      console.log(
        '  ℹ Please download iconsext.exe from https://www.nirsoft.net/utils/iconsext.html'
      )
      console.log('  ℹ Alternative paths checked:')
      console.log('    - process.resourcesPath:', process.resourcesPath)
      console.log('    - app.getAppPath():', app.getAppPath())
      return null
    }
    console.log('  ✓ IconsExtract found')

    // 创建临时目录保存图标
    const tempDir = join(tmpdir(), `icon_extract_${Date.now()}`)
    console.log('  → Creating temp directory:', tempDir)

    // 确保临时目录存在
    const fs = await import('fs')
    if (!existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
      console.log('  ✓ Temp directory created')
    }

    const tempIconPath = join(tempDir, 'icon_0.ico')

    try {
      // 使用 IconsExtract 提取图标
      // 命令格式: iconsext.exe /save "source_file" "output_dir" -icons
      const command = `"${ICONS_EXTRACT_PATH}" /save "${filePath}" "${tempDir}" -icons`
      console.log('  → Executing IconsExtract command:')
      console.log('    Command:', command)
      console.log('  → Waiting for command execution...')

      const { stdout, stderr } = await execAsync(command, { timeout: 5000 })

      console.log('  → Command execution completed')
      if (stdout && stdout.trim()) {
        console.log('  → Command stdout:', stdout.trim())
      }
      if (stderr && stderr.trim()) {
        console.log('  → Command stderr:', stderr.trim())
      }

      // 检查临时目录中的所有文件
      console.log('  → Checking temp directory for extracted files...')
      const allFiles = fs.readdirSync(tempDir)
      console.log('  → Files in temp directory:', allFiles.length > 0 ? allFiles : 'EMPTY')

      // 检查是否成功提取图标
      if (!existsSync(tempIconPath)) {
        console.log('  → Expected icon file not found:', tempIconPath)
        // 尝试查找任何 .ico 文件
        const icoFiles = allFiles.filter((f) => f.endsWith('.ico'))
        console.log('  → Searching for .ico files... found:', icoFiles.length)

        if (icoFiles.length === 0) {
          console.log('  ✗ No icon files extracted in directory')
          console.log('  ✗ IconsExtract may not have found any icons in the file')
          return null
        }

        // 评分函数：强优先 APP 主图标，惩罚文件类型图标（uts/excel 等）
        const namePriority = (name: string): number => {
          const n = name.toLowerCase()
          if (/(idi.*icon1|icon1)/.test(n)) return 1000
          if (/(app|application|main|brand|logo)/.test(n)) return 600
          if (
            /(uts|excel|xls|xlsx|word|doc|docx|ppt|pptx|txt|md|json|xml|yaml|yml|js|ts|tsx|html|htm|css|vue|pdf|project|template|readme|license)/.test(
              n
            )
          )
            return -600
          return 0
        }

        let bestDataUrl: string | null = null
        let bestScore = -1
        let bestName = ''

        for (const f of icoFiles) {
          const p = join(tempDir, f)
          const st = fs.statSync(p)
          console.log('  → Evaluating ico:', f, 'size:', st.size)

          const buf = readFileSync(p)
          const { nativeImage } = await import('electron')
          const img = nativeImage.createFromBuffer(buf)

          let dataUrl: string | null = null
          if (!img.isEmpty()) {
            dataUrl = img.toDataURL()
          } else {
            console.log('    ⚠ nativeImage failed for', f, '→ trying icojs')
            dataUrl = await convertIcoBufferToPngDataUrl(buf)
          }
          if (!dataUrl) {
            console.log('    ✗ Failed to convert', f)
            continue
          }

          // 分辨率加权（偏好更高像素）
          const rendered = nativeImage.createFromDataURL(dataUrl)
          const size = rendered.getSize()
          const dimScore = (size.width * size.height) / 100
          const score = calculateIconQuality(dataUrl) + namePriority(f) + dimScore
          console.log('    → Candidate score:', score)
          if (score > bestScore) {
            bestScore = score
            bestDataUrl = dataUrl
            bestName = f
          }
        }

        // 清理临时文件
        icoFiles.forEach((f) => {
          try {
            unlinkSync(join(tempDir, f))
          } catch {
            // Ignore cleanup errors
          }
        })
        try {
          fs.rmdirSync(tempDir)
        } catch {
          // Ignore cleanup errors
        }

        if (bestDataUrl) {
          console.log('  ✓ IconsExtract best ico selected:', bestName, 'score:', bestScore)
          console.log('=== IconsExtract Extraction End ===')
          return bestDataUrl
        }

        console.log('  ✗ No convertible ico produced a valid image')
        console.log('=== IconsExtract Extraction End ===')
        return null
      }

      // 读取提取的图标文件
      console.log('  → Reading expected icon file:', tempIconPath)
      const stats = fs.statSync(tempIconPath)
      console.log('  → Icon file size:', stats.size, 'bytes')

      // 和多文件逻辑保持一致：尝试 nativeImage → icojs
      const iconBuffer = readFileSync(tempIconPath)
      const { nativeImage } = await import('electron')
      const image = nativeImage.createFromBuffer(iconBuffer)

      let base64Icon: string | null = null
      if (!image.isEmpty()) {
        base64Icon = image.toDataURL()
        console.log('  → Icon converted to PNG base64 (nativeImage), length:', base64Icon.length)
      } else {
        console.log('  ⚠ nativeImage conversion failed, trying icojs...')
        base64Icon = await convertIcoBufferToPngDataUrl(iconBuffer)
        if (!base64Icon) {
          console.log('  ✗ icojs conversion failed as well')
          // 清理临时文件并返回 null，让后续 PowerShell 继续
          try {
            unlinkSync(tempIconPath)
            fs.rmdirSync(tempDir)
          } catch {
            // Ignore cleanup errors
          }
          return null
        }
      }

      // 清理临时文件
      try {
        unlinkSync(tempIconPath)
        fs.rmdirSync(tempDir)
        console.log('  ✓ Temp files cleaned up')
      } catch (cleanupError) {
        console.warn('  ⚠ Failed to cleanup temp files:', cleanupError)
      }

      console.log('  ✓ IconsExtract extraction succeeded')
      console.log('=== IconsExtract Extraction End ===')
      return base64Icon
    } catch (cmdError) {
      const error = cmdError as Error & {
        code?: number
        stdout?: string
        stderr?: string
      }
      console.error('  ✗ IconsExtract command failed with error:')
      console.error('    Error type:', error.name || 'Unknown')
      console.error('    Error message:', error.message || 'No message')
      if (error.code) {
        console.error('    Exit code:', error.code)
      }
      if (error.stdout) {
        console.error('    stdout:', error.stdout)
      }
      if (error.stderr) {
        console.error('    stderr:', error.stderr)
      }
      console.error('    Full error object:', error)

      // 清理临时目录
      try {
        if (existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir)
          console.log('  → Cleaning up temp directory, found files:', files)
          files.forEach((f) => {
            try {
              unlinkSync(join(tempDir, f))
            } catch {
              // Ignore cleanup errors
            }
          })
          fs.rmdirSync(tempDir)
        }
      } catch {
        // Ignore cleanup errors
      }
      console.log('=== IconsExtract Extraction End (Failed) ===')
      return null
    }
  } catch (error) {
    const err = error as Error
    console.error('  ✗ Error in IconsExtract extraction:')
    console.error('    Error type:', err.name || 'Unknown')
    console.error('    Error message:', err.message || 'No message')
    console.error('    Stack:', err.stack)
    console.log('=== IconsExtract Extraction End (Error) ===')
    return null
  }
}

/**
 * 使用增强版 PowerShell 提取图标
 * 结合 SHGetFileInfo API 和 IShellLink 接口
 */
async function extractIconViaPowerShellEnhanced(filePath: string): Promise<string | null> {
  try {
    console.log('  → Attempting enhanced PowerShell extraction for:', filePath)

    // 创建临时文件路径
    const tempId = Date.now() + Math.random()
    const tempIconPath = join(tmpdir(), `icon_${tempId}.png`)
    const tempBase64Path = join(tmpdir(), `icon_${tempId}.txt`)

    // 增强版 PowerShell 脚本
    const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$filePath = "${filePath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$tempIconPath = "${tempIconPath.replace(/\\/g, '\\\\')}"
$tempBase64Path = "${tempBase64Path.replace(/\\/g, '\\\\')}"

# 定义 SHGetFileInfo 的 P/Invoke
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public class Shell32
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct SHFILEINFO
    {
        public IntPtr hIcon;
        public int iIcon;
        public uint dwAttributes;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
        public string szDisplayName;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 80)]
        public string szTypeName;
    }

    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SHGetFileInfo(
        string pszPath,
        uint dwFileAttributes,
        ref SHFILEINFO psfi,
        uint cbFileInfo,
        uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyIcon(IntPtr hIcon);

    public const uint SHGFI_ICON = 0x000000100;
    public const uint SHGFI_LARGEICON = 0x000000000;
    public const uint SHGFI_SMALLICON = 0x000000001;
    public const uint SHGFI_USEFILEATTRIBUTES = 0x000000010;

    public static Icon GetFileIcon(string path, bool large)
    {
        SHFILEINFO shinfo = new SHFILEINFO();
        uint flags = SHGFI_ICON | (large ? SHGFI_LARGEICON : SHGFI_SMALLICON);

        IntPtr result = SHGetFileInfo(path, 0, ref shinfo, (uint)Marshal.SizeOf(shinfo), flags);
        
        if (result == IntPtr.Zero)
            return null;

        try
        {
            return (Icon)Icon.FromHandle(shinfo.hIcon).Clone();
        }
        finally
        {
            DestroyIcon(shinfo.hIcon);
        }
    }
}
"@

function Get-IconFromFile {
    param([string]$Path)
    
    Write-Host "Trying to extract icon from: $Path"
    
    # 策略1: 使用 SHGetFileInfo (最可靠的方法)
    try {
        Write-Host "  → Strategy 1: SHGetFileInfo API"
        $icon = [Shell32]::GetFileIcon($Path, $true)
        if ($icon -ne $null) {
            Write-Host "  ✓ SHGetFileInfo succeeded"
            return $icon
        }
    } catch {
        Write-Host "  ✗ SHGetFileInfo failed: $($_.Exception.Message)"
    }
    
    # 策略2: 如果是 .lnk 文件，解析快捷方式
    if ($Path -match '\\.lnk$') {
        try {
            Write-Host "  → Strategy 2: Parsing .lnk file"
            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($Path)
            
            $targetPath = $shortcut.TargetPath
            $iconLocation = $shortcut.IconLocation
            
            Write-Host "    Target: $targetPath"
            Write-Host "    Icon Location: $iconLocation"
            
            # 尝试从 icon location 提取
            if ($iconLocation -and $iconLocation -ne "") {
                $iconPath = $iconLocation -replace ',.*$', ''
                if (Test-Path $iconPath) {
                    Write-Host "  → Trying icon from IconLocation: $iconPath"
                    $icon = [Shell32]::GetFileIcon($iconPath, $true)
                    if ($icon -ne $null) {
                        Write-Host "  ✓ Extracted from IconLocation"
                        return $icon
                    }
                }
            }
            
            # 尝试从 target path 提取
            if ($targetPath -and (Test-Path $targetPath)) {
                Write-Host "  → Trying icon from TargetPath: $targetPath"
                $icon = [Shell32]::GetFileIcon($targetPath, $true)
                if ($icon -ne $null) {
                    Write-Host "  ✓ Extracted from TargetPath"
                    return $icon
                }
            }
            
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) | Out-Null
        } catch {
            Write-Host "  ✗ .lnk parsing failed: $($_.Exception.Message)"
        }
    }
    
    # 策略3: ExtractAssociatedIcon (后备方案)
    try {
        Write-Host "  → Strategy 3: ExtractAssociatedIcon"
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($Path)
        if ($icon -ne $null) {
            Write-Host "  ✓ ExtractAssociatedIcon succeeded"
            return $icon
        }
    } catch {
        Write-Host "  ✗ ExtractAssociatedIcon failed: $($_.Exception.Message)"
    }
    
    return $null
}

try {
    $icon = Get-IconFromFile $filePath
    
    if ($icon -ne $null) {
        # 转换为高质量 PNG
        $bitmap = $icon.ToBitmap()
        $bitmap.Save($tempIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $icon.Dispose()
        
        # 转换为 base64
        $bytes = [System.IO.File]::ReadAllBytes($tempIconPath)
        $base64 = [Convert]::ToBase64String($bytes)
        $base64 | Out-File -FilePath $tempBase64Path -Encoding ASCII
        
        Write-Output "SUCCESS"
    } else {
        Write-Output "FAILED: All strategies exhausted"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    Write-Host $_.Exception.StackTrace
}
`.trim()

    // 执行 PowerShell 脚本
    const { stdout, stderr } = await execAsync(`powershell -NoProfile -Command "${psScript}"`, {
      timeout: 5000
    })

    if (stderr) {
      console.error('  ✗ PowerShell stderr:', stderr)
    }

    console.log('  → PowerShell output:', stdout.trim())

    // 检查是否成功
    if (stdout.includes('SUCCESS') && existsSync(tempBase64Path)) {
      const base64Data = readFileSync(tempBase64Path, 'ascii').trim()
      const dataUrl = `data:image/png;base64,${base64Data}`

      // 清理临时文件
      try {
        if (existsSync(tempIconPath)) unlinkSync(tempIconPath)
        if (existsSync(tempBase64Path)) unlinkSync(tempBase64Path)
      } catch {
        // 忽略清理错误
      }

      console.log(`  ✓ PowerShell extraction successful, length: ${dataUrl.length}`)
      return dataUrl
    }

    // 清理临时文件
    try {
      if (existsSync(tempIconPath)) unlinkSync(tempIconPath)
      if (existsSync(tempBase64Path)) unlinkSync(tempBase64Path)
    } catch {
      // 忽略清理错误
    }

    console.log('  ✗ Enhanced PowerShell extraction failed')
    return null
  } catch (error) {
    console.error('  ✗ Error in enhanced PowerShell extraction:', error)
    return null
  }
}

/**
 * 使用简单 PowerShell 提取图标（最后的后备方案）
 */
async function extractIconViaPowerShellSimple(filePath: string): Promise<string | null> {
  try {
    console.log('  → Attempting simple PowerShell extraction for:', filePath)

    const tempId = Date.now() + Math.random()
    const tempIconPath = join(tmpdir(), `icon_${tempId}.png`)
    const tempBase64Path = join(tmpdir(), `icon_${tempId}.txt`)

    const psScript = `
Add-Type -AssemblyName System.Drawing
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$filePath = "${filePath.replace(/\\/g, '\\\\').replace(/"/g, '`"')}"
$tempIconPath = "${tempIconPath.replace(/\\/g, '\\\\')}"
$tempBase64Path = "${tempBase64Path.replace(/\\/g, '\\\\')}"
try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($filePath)
    if ($icon -ne $null) {
        $bitmap = $icon.ToBitmap()
        $bitmap.Save($tempIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        $icon.Dispose()
        $bytes = [System.IO.File]::ReadAllBytes($tempIconPath)
        $base64 = [Convert]::ToBase64String($bytes)
        $base64 | Out-File -FilePath $tempBase64Path -Encoding ASCII
        Write-Output "SUCCESS"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`.trim()

    const { stdout } = await execAsync(`powershell -NoProfile -Command "${psScript}"`, {
      timeout: 3000
    })

    if (stdout.includes('SUCCESS') && existsSync(tempBase64Path)) {
      const base64Data = readFileSync(tempBase64Path, 'ascii').trim()
      const dataUrl = `data:image/png;base64,${base64Data}`
      try {
        if (existsSync(tempIconPath)) unlinkSync(tempIconPath)
        if (existsSync(tempBase64Path)) unlinkSync(tempBase64Path)
      } catch {
        // 忽略清理错误
      }
      console.log(`  ✓ Simple PowerShell extraction successful`)
      return dataUrl
    }

    try {
      if (existsSync(tempIconPath)) unlinkSync(tempIconPath)
      if (existsSync(tempBase64Path)) unlinkSync(tempBase64Path)
    } catch {
      // 忽略清理错误
    }

    return null
  } catch (error) {
    console.error('  ✗ Error in simple PowerShell extraction:', error)
    return null
  }
}

/**
 * 直接从文件提取图标（优先使用 resedit for .exe）
 */
async function extractIconDirect(filePath: string, retryCount: number = 0): Promise<string | null> {
  const MAX_RETRIES = 2

  try {
    console.log('  → Extracting icon from:', filePath)

    // 验证文件路径
    if (!filePath || typeof filePath !== 'string') {
      console.error('  ✗ Invalid file path:', filePath)
      return null
    }

    // 清理路径 (移除引号等)
    const cleanPath = filePath.trim().replace(/^["']|["']$/g, '')
    console.log('  → Cleaned path:', cleanPath)

    // 检查文件是否存在
    if (!existsSync(cleanPath)) {
      console.error('  ✗ File does not exist:', cleanPath)
      return null
    }

    // 🎯 对于 .exe 文件，先验证是否有图标资源
    if (cleanPath.toLowerCase().endsWith('.exe')) {
      console.log('  → .exe file detected')
      if (hasIconResource(cleanPath)) {
        console.log('  ✓ Icon resource verified in .exe')
      } else {
        console.log('  ⚠ No icon resource found in .exe, but will try anyway')
      }
    }

    // IconsExtract-first：优先尝试 IconsExtract
    if (ICONS_EXTRACT_FIRST) {
      console.log('  ⚙ IconsExtract-first is enabled for direct extraction')
      const earlyIcon = await extractIconViaIconsExtract(cleanPath)
      if (earlyIcon) {
        const q = calculateIconQuality(earlyIcon)
        console.log(`  ✓ Early IconsExtract (direct) quality: ${q}`)
        if (q >= 200) {
          console.log('  ✓ Accepting early IconsExtract result')
          return earlyIcon
        }
        console.log('  ⚠ Early IconsExtract below threshold, continue with Electron API')
      }
    }

    // 收集所有尝试结果
    const attempts: Array<{ size: string; icon: string | null; length: number }> = []

    // 尝试多种尺寸,从大到小
    const sizes: Array<'small' | 'normal' | 'large'> = ['large', 'normal', 'small']

    for (const size of sizes) {
      try {
        console.log(`  → Trying size: ${size}`)
        const iconImage = await app.getFileIcon(cleanPath, { size })

        if (iconImage && !iconImage.isEmpty()) {
          const base64 = iconImage.toDataURL()
          const imageSize = iconImage.getSize()

          console.log(`  → Icon size: ${imageSize.width}x${imageSize.height}`)
          console.log(`  → Base64 length: ${base64.length}`)

          // 降低验证阈值从 1000 到 500
          // 某些小图标也是有效的
          if (base64.length < 500) {
            console.log(`  ⚠ Base64 too short (${base64.length}), might be invalid`)
            attempts.push({ size, icon: base64, length: base64.length })
            continue
          }

          // 验证图标尺寸是否合理
          if (imageSize.width < 16 || imageSize.height < 16) {
            console.log(`  ⚠ Icon too small (${imageSize.width}x${imageSize.height})`)
            // 但仍然记录这个结果，作为后备选项
            attempts.push({ size, icon: base64, length: base64.length })
            continue
          }

          console.log(`  ✓ Icon extracted successfully (${size})`)
          attempts.push({ size, icon: base64, length: base64.length })
          // 不要立即返回，继续尝试其他尺寸
        }

        console.log(`  ✗ Icon is empty for size: ${size}`)
      } catch (sizeError) {
        console.error(`  ✗ Error with size ${size}:`, sizeError)
      }
    }

    // 检查是否有成功提取的图标
    let bestElectronIcon: string | null = null
    let bestElectronQuality = 0

    if (attempts.length > 0) {
      attempts.sort((a, b) => b.length - a.length)
      const best = attempts[0]
      if (best.icon && best.length > 200) {
        bestElectronIcon = best.icon
        bestElectronQuality = calculateIconQuality(best.icon)
        console.log(`  → Best Electron icon: ${best.size}, quality: ${bestElectronQuality}`)

        // 尺寸优先：如果 Electron 得到的最佳尺寸达到 48x48 或更大，直接接受
        try {
          const { nativeImage } = await import('electron')
          const image = nativeImage.createFromDataURL(bestElectronIcon)
          const size = image.getSize()
          if (size && Math.max(size.width, size.height) >= 48) {
            console.log('  ✓ Accepting Electron icon by size (>=48px)')
            return bestElectronIcon
          }
        } catch {
          // ignore size probing errors and continue to quality checks
        }

        // 质量阈值检查
        const MIN_QUALITY_THRESHOLD = 200
        if (bestElectronQuality >= MIN_QUALITY_THRESHOLD) {
          console.log(
            `  ✓ Icon quality acceptable (${bestElectronQuality} >= ${MIN_QUALITY_THRESHOLD})`
          )
          return bestElectronIcon
        }

        console.log(
          `  ⚠ Icon quality too low (${bestElectronQuality} < ${MIN_QUALITY_THRESHOLD}), trying advanced methods...`
        )
      }
    }

    // 如果仍然失败且没有重试过，尝试重试
    if (retryCount < MAX_RETRIES) {
      console.log(`  → Retrying extraction (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
      await new Promise((resolve) => setTimeout(resolve, 100)) // 等待 100ms
      return extractIconDirect(cleanPath, retryCount + 1)
    }

    // 收集所有提取方法的结果
    const allCandidates: Array<{ icon: string; quality: number; source: string }> = []

    // 添加 Electron 的最佳结果（如果有）
    if (bestElectronIcon) {
      allCandidates.push({
        icon: bestElectronIcon,
        quality: bestElectronQuality,
        source: 'Electron API'
      })
    }

    // 尝试 IconsExtract 工具
    console.log('  → Trying IconsExtract for better quality...')
    const iconsExtIcon = await extractIconViaIconsExtract(cleanPath)
    if (iconsExtIcon) {
      const quality = calculateIconQuality(iconsExtIcon)
      console.log(`  ✓ IconsExtract succeeded (quality: ${quality})`)
      allCandidates.push({ icon: iconsExtIcon, quality, source: 'IconsExtract' })
    }

    // 尝试增强版 PowerShell 后备方案
    console.log('  → Trying enhanced PowerShell...')
    let psIcon = await extractIconViaPowerShellEnhanced(cleanPath)
    if (psIcon) {
      const quality = calculateIconQuality(psIcon)
      console.log(`  ✓ Enhanced PowerShell succeeded (quality: ${quality})`)
      allCandidates.push({ icon: psIcon, quality, source: 'PowerShell Enhanced' })
    }

    // 最后尝试简单版 PowerShell
    console.log('  → Trying simple PowerShell...')
    psIcon = await extractIconViaPowerShellSimple(cleanPath)
    if (psIcon) {
      const quality = calculateIconQuality(psIcon)
      console.log(`  ✓ Simple PowerShell succeeded (quality: ${quality})`)
      allCandidates.push({ icon: psIcon, quality, source: 'PowerShell Simple' })
    }

    // 选择质量最好的图标
    if (allCandidates.length > 0) {
      allCandidates.sort((a, b) => b.quality - a.quality)
      const best = allCandidates[0]
      console.log(
        `  ✓ Using best icon from ${best.source} (quality: ${best.quality}, total candidates: ${allCandidates.length})`
      )
      return best.icon
    }

    console.error('  ✗ All extraction methods failed for:', cleanPath)
    return null
  } catch (error) {
    console.error('  ✗ Error in extractIconDirect:', error)
    console.error('  ✗ File path was:', filePath)

    // 重试机制
    if (retryCount < MAX_RETRIES) {
      console.log(`  → Retrying after error (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
      await new Promise((resolve) => setTimeout(resolve, 100))
      return extractIconDirect(filePath, retryCount + 1)
    }

    // 尝试 IconsExtract 工具
    console.log('  ⚠ Error occurred, trying IconsExtract...')
    const iconsExtIcon = await extractIconViaIconsExtract(filePath)
    if (iconsExtIcon) {
      return iconsExtIcon
    }

    // 尝试增强版 PowerShell 方案
    console.log('  ⚠ IconsExtract failed, trying enhanced PowerShell fallback...')
    let psIcon = await extractIconViaPowerShellEnhanced(filePath)
    if (psIcon) {
      return psIcon
    }

    // 最后的最后，尝试简单版 PowerShell
    console.log('  ⚠ Trying simple PowerShell as final attempt...')
    psIcon = await extractIconViaPowerShellSimple(filePath)
    if (psIcon) {
      return psIcon
    }

    return null
  }
}
