var VersionInfo = require('./lib/versionInfo')
var execute = require('./lib/execute')
var format = require('util').format
var path = require('path')

const isWindows = process.platform === 'win32'
const isDarwin = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
var outDir = 'dist'
var arch = 'x64'
var cmds

if (isWindows) {
  if (process.env.TARGET_ARCH === 'ia32') {
    arch = 'ia32'
  }
}

const channel = process.env.CHANNEL

var channels = { nightly: true, developer: true, beta: true, dev: true }
if (!channels[channel]) {
  throw new Error('CHANNEL environment variable must be set to developer, beta or dev')
}

var appName
switch (channel) {
  case 'nightly':
    appName = 'Brave-Nightly'
    break
  case 'developer':
    appName = 'Brave-Developer'
    break
  case 'beta':
    appName = 'Brave-Beta'
    break
  case 'dev':
    appName = 'Brave'
    break
  default:
    throw new Error('CHANNEL environment variable must be set to developer, beta or dev')
}

if (isLinux) {
  appName = appName.toLowerCase()
}

if (isWindows) {
  appName = appName.replace(/-/, '')
}

const buildDir = appName + '-' + process.platform + '-' + arch

console.log('Building install and update for version ' + VersionInfo.braveVersion + ' in ' + buildDir + ' with Electron ' + VersionInfo.electronVersion)

if (isDarwin) {
  const identifier = process.env.IDENTIFIER
  if (!identifier) {
    console.error('IDENTIFIER needs to be set to the certificate organization')
    process.exit(1)
  }

  cmds = [
    // Remove old
    'rm -f ' + outDir + `/${appName}.dmg`,

    // Sign it
    'cd ' + buildDir + `/${appName}.app/Contents/Frameworks`,
    'codesign --deep --force --strict --verbose --sign $IDENTIFIER *',
    'cd ../../..',
    `codesign --deep --force --strict --verbose --sign $IDENTIFIER ${appName}.app/`,

    // Package it into a dmg
    'cd ..',
    'build ' +
      '--prepackaged="' + buildDir + `/${appName}.app" ` +
      '--mac=dmg ' +
      ` --config=res/${channel}/builderConfig.json `,

    // Create an update zip
    'ditto -c -k --sequesterRsrc --keepParent ' + buildDir + `/${appName}.app dist/${appName}-` + VersionInfo.braveVersion + '.zip'
  ]
  execute(cmds, {}, console.log.bind(null, 'done'))
} else if (isWindows) {
  // a cert file must be present to sign the created package
  // a password MUST be passed as the CERT_PASSWORD environment variable
  var cert = process.env.CERT || '../brave-authenticode.pfx'
  var certPassword = process.env.CERT_PASSWORD
  if (!certPassword) {
    throw new Error('Certificate password required. Set environment variable CERT_PASSWORD.')
  }

  // Because both x64 and ia32 creates a RELEASES and a .nupkg file we
  // need to store the output files in separate directories
  outDir = path.join(outDir, arch)

  var muonInstaller = require('muon-winstaller')
  var resultPromise = muonInstaller.createWindowsInstaller({
    appDirectory: buildDir,
    outputDirectory: outDir,
    title: appName,
    name: appName,
    authors: 'Brave Software',
    loadingGif: 'res/brave_splash_installing.gif',
    setupIcon: `res/${channel}/brave_installer.ico`,
    iconUrl: `https://raw.githubusercontent.com/brave/browser-laptop/coexisted-channels/res/${channel}/app.ico`,
    signWithParams: format('-a -fd sha256 -f "%s" -p "%s" -t http://timestamp.verisign.com/scripts/timstamp.dll', path.resolve(cert), certPassword),
    noMsi: true,
    exe: `${appName}.exe`,
    setupExe: `${appName}-Setup-${arch}.exe`
  })
  resultPromise.then(() => {
    cmds = [
    ]
    execute(cmds, {}, console.log.bind(null, 'done'))
  }, (e) => console.log(`No dice: ${e.message}`))
} else if (isLinux) {
  console.log(`Install with sudo dpkg -i dist/${appName}_` + VersionInfo.braveVersion + '_amd64.deb')
  console.log(`Or install with sudo dnf install dist/${appName}_` + VersionInfo.braveVersion + '.x86_64.rpm')
  cmds = [
    // .deb file
    'electron-installer-debian' +
      ` --src ${appName}-linux-x64/` +
      ' --dest dist/' +
      ' --arch amd64' +
      ` --config res/${channel}/linuxPackaging.json`,
    // .rpm file
    'electron-installer-redhat' +
      ` --src ${appName}-linux-x64/` +
      ' --dest dist/' +
      ' --arch x86_64' +
      ` --config res/${channel}/linuxPackaging.json`,
    // .tar.bz2 file
    `tar -jcvf dist/${appName}.tar.bz2 ./${appName}-linux-x64`
  ]
  execute(cmds, {}, (err) => {
    if (err) {
      console.error('buildInstaller failed', err)
      process.exit(1)
      return
    }
    console.log('done')
  })
} else {
  console.log('Installer not supported for platform: ' + process.platform)
  process.exit(1)
}
