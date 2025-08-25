#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const parser = new xml2js.Parser();
const builder = new xml2js.Builder();

const densities = ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'];

module.exports = function (ctx) {
    const projectRoot = ctx.opts.projectRoot;    
    console.log("📂 projectRoot:", projectRoot);
    const pluginRoot  = ctx.opts.plugin.dir;
    console.log("📂 pluginRoot:", pluginRoot);

    // Keep track of the app icon folder name, fetched later on from installation variable
    let appIconFolder = null;

    // Get plugin details
    const plugin = ctx.opts.plugin;

    if (plugin) {
        const fetchJsonPath = path.join(projectRoot, "plugins", "fetch.json");
        const fetchData = JSON.parse(fs.readFileSync(fetchJsonPath, "utf8"));

        const pluginId = plugin.id;
        const vars = fetchData[pluginId] && fetchData[pluginId].variables;

        console.log(">>> Vars from fetch.json:", vars);
        console.log("APP_ICON_FOLDER:", vars.APP_ICON_FOLDER);

        // Update the app icon folder to the installation variable
        appIconFolder = vars.APP_ICON_FOLDER;
    } else {
        console.warn("⚠️ No plugin object found in ctx.opts");
        return;
    }

    if (!appIconFolder) {
        console.warn("⚠️ No APP_ICON_FOLDER preference found in config.xml or plugin.xml");
        return;
    }

    
    const configPath = path.join(projectRoot, "config.xml");
    const pluginResPath = `${pluginRoot}/res/icons/${appIconFolder}`;

    fs.readFile(configPath, (err, data) => {
        if (err) throw err;

        parser.parseString(data, (err, result) => {
            if (err) throw err;

            let platform = result.widget.platform?.find(p => p.$.name === 'android');
            if (!platform) {
                // Create platform node if missing
                platform = { $: { name: 'android' }, icon: [] };
                result.widget.platform = result.widget.platform || [];
                result.widget.platform.push(platform);
            }

            // Copy background color xml
            fs.copyFileSync(`${pluginResPath}/values/ic_launcher_background.xml`, `${projectRoot}/platforms/android/app/src/main/res/values/ic_launcher_background.xml`);

            // Remove existing adaptive-icon entries
            platform.icon = [];

            densities.forEach(density => {
                const foreground  = `${pluginResPath}/mipmap-${density}/ic_launcher_foreground.png`;
                console.log("📂 foreground:", foreground);
                const background  = `@color/ic_launcher_background`;
                const monochrome  = `${pluginResPath}/mipmap-${density}/ic_launcher_monochrome.png`;
                console.log("📂 monochrome:", monochrome);
                //const defaultIcon = `${pluginResPath}/mipmap-${density}/ic_launcher.png`;

                // Add entry to config.xml
                platform.icon.push({
                    $: { foreground: foreground.replace(`${projectRoot}/`, ""), background, monochrome: monochrome.replace(`${projectRoot}/`, ""), density }
                });

                // Copy to platforms/android
                const targetDir = path.join(projectRoot, `platforms/android/app/src/main/res/mipmap-${density}`);
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                console.log("📂 targetDir:", targetDir);

                fs.copyFileSync(foreground, `${targetDir}/ic_launcher_foreground.png`);
                fs.copyFileSync(monochrome, `${targetDir}/ic_launcher_monochrome.png`);
                //fs.copyFileSync(defaultIcon, `${targetDir}/ic_launcher.png`);
            });

            const xml = builder.buildObject(result);
            fs.writeFile(configPath, xml, err => {
                if (err) throw err;
                console.log('Adaptive icons updated in config.xml and copied to platforms successfully!');
            });
        });
    });
};