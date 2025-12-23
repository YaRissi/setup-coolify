const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const { Octokit } = require("@octokit/rest");

const baseDownloadURL = "https://github.com/coollabsio/coolify-cli/releases/download";
const fallbackURL = "https://app.coolify.io";
const fallbackVersion = "1.4.0";
const octokit = new Octokit();

async function getRecentReleases(count = 5) {
    try {
        const response = await octokit.repos.listReleases({
            owner: 'coollabsio',
            repo: 'coolify-cli',
            per_page: count
        });
        return response.data.map(release => release.name);
    } catch (error) {
        core.warning(`Failed to fetch recent releases: ${error.message}`);
        return [fallbackVersion];
    }
}

async function downloadCoolify(version, type, architecture) {
    var platform = 'linux';
    var arch = 'amd64';
    var extension = 'tar.gz';

    switch (type) {
        case 'darwin':
            platform = 'darwin';
            break;
        case 'win32':
            platform = 'windows';
            extension = 'zip'
            break;
        case 'linux':
            platform = 'linux';
            break;
        default:
            core.warning(`unknown platform: ${type}; defaulting to ${platform}`);
            break;
    }

    switch (architecture) {
        case 'arm64':
            arch = 'arm64';
            break;
        case 'x64':
            arch = 'amd64';
            break;
        case 'ia32':
            arch = '386';
            break;
        default:
            core.warning(`unknown architecture: ${architecture}; defaulting to ${arch}`);
            break;
    }

    const downloadURL = `${baseDownloadURL}/v${version}/coolify-cli_${version}_${platform}_${arch}.${extension}`;
    core.debug(`coolify download url: ${downloadURL}`);

    try {
        const coolifyDownload = await tc.downloadTool(downloadURL);
        return tc.extractTar(coolifyDownload);
    } catch (error) {
        core.warning(`Failed to download coolify v${version}: ${error.message}`);
        throw new Error(`Download failed for version ${version}: ${error.message}`);
    }
}

async function downloadCoolifyWithFallback(requestedVersion, type, architecture) {
    // If a specific version was requested, try it first
    if (requestedVersion !== 'latest') {
        try {
            core.info(`Attempting to download coolify v${requestedVersion}`);
            return await downloadCoolify(requestedVersion, type, architecture);
        } catch (error) {
            core.warning(`Failed to download requested version v${requestedVersion}: ${error.message}`);
        }
    }

    // Get recent releases and try them in order
    const recentReleases = await getRecentReleases(5);

    for (const version of recentReleases) {
        try {
            core.info(`Attempting to download coolify v${version}`);
            const installPath = await downloadCoolify(version, type, architecture);
            core.info(`Successfully downloaded coolify v${version}`);
            return { installPath, version };
        } catch (error) {
            core.warning(`Failed to download coolify v${version}: ${error.message}`);
            continue;
        }
    }

    // If all recent versions fail, throw an error
    throw new Error(`Failed to download coolify. Tried versions: ${recentReleases.join(', ')}`);
}

async function run() {
    try {
        var version = core.getInput('version');
        var requestedVersion = version;

        if ((!version) || (version.toLowerCase() === 'latest')) {
            version = await octokit.repos.getLatestRelease({
                owner: 'digitalocean',
                repo: 'doctl'
            }).then(result => {
                return result.data.name;
            }).catch(error => {
                // GitHub rate-limits are by IP address and runners can share IPs.
                // This mostly effects macOS where the pool of runners seems limited.
                // Fallback to a known version if API access is rate limited.
                core.warning(`${error.message}

Failed to retrieve latest version; falling back to: ${fallbackVersion}`);
                return fallbackVersion;
            });
            requestedVersion = 'latest';
        }
        if (version.charAt(0) === 'v') {
            version = version.substr(1);
        }

        var path = tc.find("coolify", version);
        var actualVersion = version;

        if (!path) {
            try {
                // Try the requested/latest version first
                const installPath = await downloadCoolify(version, process.platform, process.arch);
                path = await tc.cacheDir(installPath, 'coolify', version);
                actualVersion = version;
            } catch (error) {
                // If the download fails (e.g., missing artifacts), try fallback versions
                core.warning(`Failed to download coolify v${version}: ${error.message}`);
                const result = await downloadCoolifyWithFallback(requestedVersion, process.platform, process.arch);
                path = await tc.cacheDir(result.installPath, 'coolify', result.version);
                actualVersion = result.version;
            }
        }

        core.addPath(path);
        core.info(`>>> coolify version v${actualVersion} installed to ${path}`);

        var token = core.getInput('token', { required: true });

        var url = core.getInput('url');
        if (!url) {
            url = fallbackURL;
        }
        core.setSecret(token);
        await exec.exec('coolify context add actions-context ' + token + ' ' + url + ' --default --force');
        core.info('>>> Successfully logged into coolify');
    }
    catch (error) {
        core.setFailed(error.message);
    }
}

run();
